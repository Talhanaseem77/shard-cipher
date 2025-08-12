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
  encryptedKey: string; // File key encrypted with user's master key
  encryptedIv: string;   // File IV encrypted with user's master key
}

export interface DecryptedFileMetadata extends Omit<EncryptedFileMetadata, 'encryptedKey' | 'encryptedIv'> {
  key: string; // Decrypted file key for UI display
  iv: string;  // Decrypted file IV for UI display
}

export interface UploadResult {
  fileId: string;
  downloadUrl: string;
}

// Upload an encrypted file
export async function uploadEncryptedFile(
  file: File,
  userKey: CryptoKey,
  password: string,
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

    // Encrypt the file keys with user's master key
    const encoder = new TextEncoder();
    const keyIv = crypto.getRandomValues(new Uint8Array(12));
    const ivIv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedKeyData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: keyIv },
      userKey,
      encoder.encode(key)
    );
    
    const encryptedIvData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivIv },
      userKey,
      encoder.encode(iv)
    );
    
    const encryptedKey = Array.from(keyIv).map(b => b.toString(16).padStart(2, '0')).join('') + 
                        Array.from(new Uint8Array(encryptedKeyData)).map(b => b.toString(16).padStart(2, '0')).join('');
    const encryptedIv = Array.from(ivIv).map(b => b.toString(16).padStart(2, '0')).join('') + 
                       Array.from(new Uint8Array(encryptedIvData)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Update user's encrypted file list
    await updateUserFileList(user.id, password, {
      id: fileId,
      fileId,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toISOString(),
      expiresAt: expiresAt || undefined,
      maxDownloads,
      downloadCount: 0,
      encryptedKey,
      encryptedIv
    });

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

// Get user's encrypted file list and decrypt file keys for display
export async function getUserFileList(userKey: CryptoKey, password: string): Promise<DecryptedFileMetadata[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  try {
    const { data, error } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list, salt')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return [];

    // Parse the file list
    try {
      // Decrypt the file list using the user's password
      const encryptedFileList = await SecureFileIndex.decryptFileList(
        data.encrypted_file_list,
        password,
        data.salt,
        data.iv || ''
      );
      
      // Decrypt individual file keys for UI display
      const decryptedFileList: DecryptedFileMetadata[] = [];
      const decoder = new TextDecoder();
      
      for (const file of encryptedFileList) {
        try {
          // Extract IV and encrypted data for key
          const keyIvHex = file.encryptedKey.substring(0, 24); // 12 bytes = 24 hex chars
          const keyDataHex = file.encryptedKey.substring(24);
          const keyIv = new Uint8Array(keyIvHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
          const keyData = new Uint8Array(keyDataHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
          
          // Extract IV and encrypted data for iv
          const ivIvHex = file.encryptedIv.substring(0, 24);
          const ivDataHex = file.encryptedIv.substring(24);
          const ivIv = new Uint8Array(ivIvHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
          const ivData = new Uint8Array(ivDataHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
          
          // Decrypt the file key and IV
          const decryptedKeyBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: keyIv },
            userKey,
            keyData
          );
          
          const decryptedIvBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivIv },
            userKey,
            ivData
          );
          
          const key = decoder.decode(decryptedKeyBuffer);
          const iv = decoder.decode(decryptedIvBuffer);
          
          decryptedFileList.push({
            ...file,
            key,
            iv
          });
        } catch (decryptError) {
          console.error('Error decrypting file keys for file:', file.fileId, decryptError);
          // Skip files that can't be decrypted
        }
      }
      
      return decryptedFileList;
    } catch (parseError) {
      console.error('Error parsing/decrypting file list:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Error getting file list:', error);
    return [];
  }
}

// Update user's encrypted file list
export async function updateUserFileList(userId: string, password: string, newFile: EncryptedFileMetadata): Promise<void> {
  try {
    // Get existing file list
    const { data: existingData } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list, salt, iv')
      .eq('user_id', userId)
      .maybeSingle();

    // Parse existing files
    let existingFiles: EncryptedFileMetadata[] = [];
    if (existingData?.encrypted_file_list && existingData?.salt) {
      try {
        // Decrypt existing file list
        existingFiles = await SecureFileIndex.decryptFileList(
          existingData.encrypted_file_list,
          password,
          existingData.salt,
          existingData.iv || ''
        );
      } catch (decryptError) {
        console.error('Error decrypting existing file list:', decryptError);
        existingFiles = [];
      }
    }

    // Add new file to the list (avoid duplicates by fileId)
    const updatedFiles = existingFiles.filter(file => file.fileId !== newFile.fileId);
    updatedFiles.push(newFile);

    // Encrypt the updated file list
    const { encryptedData, salt, iv } = await SecureFileIndex.encryptFileList(updatedFiles, password);

    // Store updated file list
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

    console.log('File list updated successfully for user:', userId, 'Total files:', updatedFiles.length);
  } catch (error) {
    console.error('Error updating file list:', error);
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

    // Note: removeFromUserFileList needs password parameter - will be handled by UI

    // Log delete action
    await logAction('delete', { fileId });
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

// Remove file from user's encrypted file list
export async function removeFromUserFileList(userId: string, password: string, fileId: string): Promise<void> {
  try {
    const { data: currentData } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list, salt, iv')
      .eq('user_id', userId)
      .maybeSingle();

    if (!currentData) return;

    // Decrypt the current list
    const currentList = await SecureFileIndex.decryptFileList(
      currentData.encrypted_file_list,
      password,
      currentData.salt,
      currentData.iv || ''
    );
    
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
    console.error('Error removing from file list:', error);
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

    // Note: Download count update in encrypted file list needs password - handled by UI

    // Log download action
    await logAction('download', { fileId });
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// Helper function to update file list data with encryption
export async function updateUserFileListData(userId: string, password: string, fileList: EncryptedFileMetadata[]): Promise<void> {
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
    console.error('Error updating file list:', error);
  }
}