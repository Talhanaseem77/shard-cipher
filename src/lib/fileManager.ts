import { supabase } from '@/integrations/supabase/client';
import { encryptFile, generateDownloadUrl, decryptFile } from './encryption';
import type { Database } from '@/integrations/supabase/types';

// Password management for file list encryption
let cachedPassword: string | null = null;

export async function setPassword(password: string): Promise<void> {
  cachedPassword = password;
  sessionStorage.setItem('file_password', password);
}

export async function getStoredPassword(): Promise<string | null> {
  if (cachedPassword) return cachedPassword;
  
  const stored = sessionStorage.getItem('file_password');
  if (stored) {
    cachedPassword = stored;
    return stored;
  }
  
  return null;
}

export function clearPassword(): void {
  cachedPassword = null;
  sessionStorage.removeItem('file_password');
}

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

    // Get password for file list encryption
    const password = await getStoredPassword();
    if (!password) {
      throw new Error('Password required for file encryption');
    }

    // Update user's file list
    await updateUserFileList(user.id, {
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
    }, password);

    // Generate download URL with properly encoded keys
    const downloadUrl = generateDownloadUrl(fileId, key, iv);

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
      .select('encrypted_file_list, salt')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return [];

    // Decrypt the file list using password-derived key
    try {
      const { decryptFileList } = await import('./encryption');
      const fileList = await decryptFileList(data.encrypted_file_list, password, data.salt);
      return Array.isArray(fileList) ? fileList : [];
    } catch (parseError) {
      console.error('Error decrypting file list:', parseError);
      throw new Error('Invalid password or corrupted file list');
    }
  } catch (error) {
    console.error('Error getting file list:', error);
    throw error;
  }
}

// Update user's encrypted file list
export async function updateUserFileList(userId: string, newFile: EncryptedFileMetadata, password: string): Promise<void> {
  try {
    const { encryptFileList, decryptFileList, generateSalt, arrayBufferToBase64 } = await import('./encryption');
    
    // Get existing file list
    const { data: existingData, error: fetchError } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list, salt')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let fileList: EncryptedFileMetadata[] = [];
    let salt = existingData?.salt;

    // If we have existing data, decrypt it first
    if (existingData?.encrypted_file_list && existingData?.salt) {
      try {
        fileList = await decryptFileList(existingData.encrypted_file_list, password, existingData.salt);
      } catch (decryptError) {
        console.error('Error decrypting existing file list:', decryptError);
        throw new Error('Invalid password for existing file list');
      }
    } else {
      // Generate new salt if no existing data
      const saltBuffer = generateSalt();
      salt = arrayBufferToBase64(saltBuffer);
    }

    // Add or update the file in the list
    const existingIndex = fileList.findIndex(f => f.fileId === newFile.fileId);
    if (existingIndex >= 0) {
      fileList[existingIndex] = newFile;
    } else {
      fileList.push(newFile);
    }

    // Encrypt the updated file list
    const { encryptedList } = await encryptFileList(fileList, password, salt ? new Uint8Array(Buffer.from(salt, 'base64')) : undefined);

    // Save encrypted list
    const { error: updateError } = await supabase
      .from('user_file_index')
      .upsert({
        user_id: userId,
        encrypted_file_list: encryptedList,
        salt: salt
      });

    if (updateError) throw updateError;

    console.log('File list updated successfully');
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

    // Get password for file list decryption
    const password = await getStoredPassword();
    if (!password) {
      throw new Error('Password required for file list decryption');
    }

    // Remove from user's file list
    await removeFromUserFileList(user.id, fileId, password);

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
    const { encryptFileList, decryptFileList } = await import('./encryption');
    
    // Get existing file list
    const { data: existingData, error: fetchError } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list, salt')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingData?.encrypted_file_list || !existingData?.salt) return; // Nothing to remove

    let fileList: EncryptedFileMetadata[] = [];
    try {
      fileList = await decryptFileList(existingData.encrypted_file_list, password, existingData.salt);
    } catch (decryptError) {
      console.error('Error decrypting file list for removal:', decryptError);
      throw new Error('Invalid password for file list decryption');
    }

    // Remove the file from the list
    const updatedList = fileList.filter(f => f.fileId !== fileId);

    // Encrypt the updated list
    const { encryptedList } = await encryptFileList(updatedList, password, new Uint8Array(Buffer.from(existingData.salt, 'base64')));

    // Save updated list
    const { error: updateError } = await supabase
      .from('user_file_index')
      .update({
        encrypted_file_list: encryptedList
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error removing file from list:', error);
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

    // Update the user's file list with new download count
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const password = await getStoredPassword();
      if (password) {
        const fileList = await getUserFileList(password);
        const updatedFileList = fileList.map(file => 
          file.fileId === fileId 
            ? { ...file, downloadCount: newDownloadCount }
            : file
        );
        await updateUserFileList(user.id, updatedFileList[0], password);
      }
    }

    // Log download action
    await logAction('download', { fileId });
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}