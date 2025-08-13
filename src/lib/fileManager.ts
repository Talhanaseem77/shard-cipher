import { supabase } from '@/integrations/supabase/client';
import { encryptFile, decryptFileList } from '@/lib/encryption';
import { SecureDataManager } from '@/lib/secureDataManager';

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

    // Update user's encrypted file list using secure encryption
    const newFileMetadata = {
      id: fileId,
      fileId,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toISOString(),
      expiresAt: expiresAt || undefined,
      maxDownloads,
      downloadCount: 0,
      key,
      iv
    };
    
    const existingFiles = await SecureDataManager.getDecryptedFileList(user.id);
    const updatedFiles = existingFiles.filter(f => f.fileId !== fileId);
    updatedFiles.push(newFileMetadata);
    await SecureDataManager.storeEncryptedFileList(user.id, updatedFiles);

    // Generate download URL with properly encoded keys
    const downloadUrl = `${window.location.origin}/f/${fileId}#key=${encodeURIComponent(key)}&iv=${encodeURIComponent(iv)}`;

    // Log upload action with encryption
    await SecureDataManager.storeEncryptedAuditLog(user.id, {
      action: 'upload',
      timestamp: new Date().toISOString(),
      data: {
        fileId,
        fileName: file.name,
        fileSize: file.size
      }
    });

    return { fileId, downloadUrl };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Get user's encrypted file list with secure decryption
export async function getUserFileList(): Promise<EncryptedFileMetadata[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  try {
    return await SecureDataManager.getDecryptedFileList(user.id);
  } catch (error) {
    console.error('Error getting file list:', error);
    return [];
  }
}

// Update user's encrypted file list with secure encryption
export async function updateUserFileList(userId: string, newFile: EncryptedFileMetadata): Promise<void> {
  try {
    const existingFiles = await SecureDataManager.getDecryptedFileList(userId);
    const updatedFiles = existingFiles.filter(file => file.fileId !== newFile.fileId);
    updatedFiles.push(newFile);
    
    await SecureDataManager.storeEncryptedFileList(userId, updatedFiles);
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

    // Update user's file list
    await removeFromUserFileList(user.id, fileId);

    // Log delete action with encryption
    await SecureDataManager.storeEncryptedAuditLog(user.id, {
      action: 'delete',
      timestamp: new Date().toISOString(),
      data: { fileId }
    });
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

// Remove file from user's encrypted file list with secure encryption
export async function removeFromUserFileList(userId: string, fileId: string): Promise<void> {
  try {
    const currentList = await SecureDataManager.getDecryptedFileList(userId);
    const updatedList = currentList.filter((file: any) => file.fileId !== fileId);
    await SecureDataManager.storeEncryptedFileList(userId, updatedList);
  } catch (error) {
    console.error('Error removing from file list:', error);
    throw error;
  }
}

// Log user actions with secure encryption
export async function logAction(action: string, data: any): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await SecureDataManager.storeEncryptedAuditLog(user.id, {
      action,
      timestamp: new Date().toISOString(),
      data,
      userAgent: navigator.userAgent
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

    // Update the user's file list with new download count and log download action
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const fileList = await getUserFileList();
      const updatedFileList = fileList.map(file => 
        file.fileId === fileId 
          ? { ...file, downloadCount: newDownloadCount }
          : file
      );
      await updateUserFileListData(currentUser.id, updatedFileList);

      // Log download action with encryption
      await SecureDataManager.storeEncryptedAuditLog(currentUser.id, {
        action: 'download',
        timestamp: new Date().toISOString(),
        data: { fileId }
      });
    }
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// Helper function to update file list data with secure encryption
async function updateUserFileListData(userId: string, fileList: EncryptedFileMetadata[]): Promise<void> {
  try {
    await SecureDataManager.storeEncryptedFileList(userId, fileList);
  } catch (error) {
    console.error('Error updating file list:', error);
  }
}