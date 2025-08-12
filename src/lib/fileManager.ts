import { supabase } from '@/integrations/supabase/client';
import { encryptFile, encryptFileList, decryptFileList } from '@/lib/encryption';
import { SecureFileIndex } from '@/lib/secureFileIndex';

export interface EncryptedFileMetadata {
  id: string;
  fileId: string;
  originalName: string;
  size: number;
  type: string;
  uploadDate: string;
  expiresAt?: string;
  maxDownloads?: number;
  downloadCount: number;
  key: string;
  iv: string;
}

export interface UploadResult {
  fileId: string;
  downloadUrl: string;
}

// Upload an encrypted file
export async function uploadEncryptedFile(
  file: File,
  expiryDays?: number,
  maxDownloads?: number
): Promise<UploadResult> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  try {
    // Encrypt file client-side
    const { encryptedFile, encryptedMetadata, key, iv } = await encryptFile(file);

    // Generate file ID
    const { data: fileIdData, error: fileIdError } = await supabase
      .rpc('generate_file_id');
    
    if (fileIdError) throw fileIdError;
    const fileId = fileIdData;

    // Upload encrypted file to storage
    const storagePath = `${user.id}/${fileId}`;
    const { error: uploadError } = await supabase.storage
      .from('encrypted-files')
      .upload(storagePath, new Blob([encryptedFile]), {
        contentType: 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Calculate expiry date
    const expiresAt = expiryDays 
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Save metadata to database
    const { error: metadataError } = await supabase
      .from('encrypted_files')
      .insert({
        user_id: user.id,
        file_id: fileId,
        encrypted_filename: encryptedMetadata,
        encrypted_metadata: { encryptedMetadata },
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        expires_at: expiresAt,
        max_downloads: maxDownloads
      });

    if (metadataError) throw metadataError;

    // Update user's encrypted file list - requires password
    // This will be handled by the UI component that has the password

    // Generate download URL with properly encoded keys
    const downloadUrl = `${window.location.origin}/f/${fileId}#key=${encodeURIComponent(key)}&iv=${encodeURIComponent(iv)}`;

    // Log upload action
    await logAction('upload', {
      fileId,
      fileName: file.name,
      fileSize: file.size
    });

    return { fileId, downloadUrl };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Get user's encrypted file list
export async function getUserFileList(password: string): Promise<EncryptedFileMetadata[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  try {
    const { data, error } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list, salt, iv')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data || !data.encrypted_file_list) {
      // No encrypted file list exists yet - this is normal for new users
      return [];
    }

    // Decrypt the file list using password
    try {
      const decryptedFileList = await SecureFileIndex.decryptFileList(
        data.encrypted_file_list,
        password,
        data.salt,
        data.iv
      );
      return Array.isArray(decryptedFileList) ? decryptedFileList : [];
    } catch (decryptError) {
      console.error('Error decrypting file list - wrong password?:', decryptError);
      // More specific error message
      if (!data.encrypted_file_list) {
        throw new Error('No files uploaded yet. Upload a file first to create your encrypted file list.');
      } else {
        throw new Error('Incorrect password. Please enter the password you used when uploading your first file.');
      }
    }
  } catch (error) {
    console.error('Error getting file list:', error);
    throw error;
  }
}

// Update user's encrypted file list with password-based encryption
export async function updateUserFileList(userId: string, newFile: EncryptedFileMetadata, password: string): Promise<void> {
  try {
    // Get existing encrypted file list
    const { data: existingData } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list, salt, iv')
      .eq('user_id', userId)
      .maybeSingle();

    // Decrypt existing files if they exist
    let existingFiles: EncryptedFileMetadata[] = [];
    if (existingData?.encrypted_file_list && existingData.salt && existingData.iv) {
      try {
        existingFiles = await SecureFileIndex.decryptFileList(
          existingData.encrypted_file_list,
          password,
          existingData.salt,
          existingData.iv
        );
      } catch (decryptError) {
        console.error('Error decrypting existing file list:', decryptError);
        // Start fresh if decryption fails
        existingFiles = [];
      }
    }

    // Add new file to the list (avoid duplicates by fileId)
    const updatedFiles = existingFiles.filter(file => file.fileId !== newFile.fileId);
    updatedFiles.push(newFile);

    // Encrypt the updated file list
    const { encryptedData, salt, iv } = await SecureFileIndex.encryptFileList(updatedFiles, password);

    // Store encrypted file list
    const { error: upsertError } = await supabase
      .from('user_file_index')
      .upsert({
        user_id: userId,
        encrypted_file_list: encryptedData,
        salt,
        iv
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw upsertError;
    }

    console.log('Encrypted file list updated successfully for user:', userId, 'Total files:', updatedFiles.length);
  } catch (error) {
    console.error('Error updating encrypted file list:', error);
    throw error;
  }
}

// Delete an encrypted file
export async function deleteEncryptedFile(fileId: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  try {
    // Get file metadata
    const { data: fileData, error: fileError } = await supabase
      .from('encrypted_files')
      .select('storage_path')
      .eq('file_id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fileError) throw fileError;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('encrypted-files')
      .remove([fileData.storage_path]);

    if (storageError) throw storageError;

    // Delete metadata from database
    const { error: dbError } = await supabase
      .from('encrypted_files')
      .delete()
      .eq('file_id', fileId)
      .eq('user_id', user.id);

    if (dbError) throw dbError;

    // Update user's file list - requires password from UI

    // Log delete action
    await logAction('delete', { fileId });
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

// Remove file from user's encrypted file list
export async function removeFromUserFileList(userId: string, fileId: string, password: string): Promise<void> {
  try {
    const { data: currentData } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list, salt, iv')
      .eq('user_id', userId)
      .maybeSingle();

    if (!currentData || !currentData.encrypted_file_list) return;

    // Decrypt the current list
    const currentList = await SecureFileIndex.decryptFileList(
      currentData.encrypted_file_list,
      password,
      currentData.salt,
      currentData.iv
    );
    
    // Filter out the deleted file
    const updatedList = currentList.filter((file: any) => file.fileId !== fileId);

    // Re-encrypt the updated list
    const { encryptedData, salt, iv } = await SecureFileIndex.encryptFileList(updatedList, password);

    await supabase
      .from('user_file_index')
      .update({
        encrypted_file_list: encryptedData,
        salt,
        iv
      })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error removing from encrypted file list:', error);
    throw error;
  }
}

// Log user actions (encrypted)
export async function logAction(action: string, data: any): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const logEntry = {
      action,
      timestamp: new Date().toISOString(),
      data
    };

    // For now, store as JSON - in production, encrypt this too
    await supabase
      .from('encrypted_audit_logs')
      .insert({
        user_id: user?.id || null,
        encrypted_log_entry: JSON.stringify(logEntry),
        log_type: action,
        ip_address: null, // Would be set by edge function
        user_agent: navigator.userAgent
      });
  } catch (error) {
    console.error('Logging error:', error);
    // Don't throw - logging failures shouldn't break functionality
  }
}

// Temporary password prompt - in production, implement secure password management
async function promptForPassword(): Promise<string | null> {
  // This is a simple implementation - in production, use secure password derivation
  // from user's authentication or a secure vault
  return prompt('Enter your password to decrypt file list:');
}

// Download encrypted file by ID
export async function downloadEncryptedFile(fileId: string, key: string, iv: string): Promise<void> {
  try {
    console.log('Starting download for file ID:', fileId);
    
    // Get file metadata from database
    const { data: fileData, error: fileError } = await supabase
      .from('encrypted_files')
      .select('storage_path, encrypted_metadata, encrypted_filename, download_count, max_downloads')
      .eq('file_id', fileId)
      .single();

    if (fileError) {
      console.error('Database error:', fileError);
      throw new Error(`File not found: ${fileError.message}`);
    }

    console.log('File data retrieved:', fileData);

    // Check download limits
    if (fileData.max_downloads && fileData.download_count >= fileData.max_downloads) {
      throw new Error('Download limit exceeded');
    }

    // Get encrypted file from storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('encrypted-files')
      .download(fileData.storage_path);

    if (storageError) throw storageError;

    // Convert to ArrayBuffer
    const encryptedFile = await storageData.arrayBuffer();

    // Decrypt file client-side
    const { decryptFile } = await import('@/lib/encryption');
    const metadataObj = fileData.encrypted_metadata as any;
    const encryptedMetadataStr = metadataObj?.encryptedMetadata || fileData.encrypted_filename;
    const { file, metadata } = await decryptFile(encryptedFile, encryptedMetadataStr, key, iv);

    // Trigger download
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = metadata.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Update download count and refresh file list in memory
    const newDownloadCount = fileData.download_count + 1;
    await supabase
      .from('encrypted_files')
      .update({ download_count: newDownloadCount })
      .eq('file_id', fileId);

    // Note: Download count update in file list would require password from UI

    // Log download action
    await logAction('download', { fileId });
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// Helper function to update encrypted file list data
export async function updateUserFileListData(userId: string, fileList: EncryptedFileMetadata[], password: string): Promise<void> {
  try {
    const { encryptedData, salt, iv } = await SecureFileIndex.encryptFileList(fileList, password);
    
    await supabase
      .from('user_file_index')
      .upsert({
        user_id: userId,
        encrypted_file_list: encryptedData,
        salt,
        iv
      }, {
        onConflict: 'user_id'
      });
  } catch (error) {
    console.error('Error updating encrypted file list:', error);
    throw error;
  }
}