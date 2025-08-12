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

    // Calculate expiry date
    const expiresAt = expiryDays 
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('encrypted-files')
      .upload(`${user.id}/${fileId}`, encryptedFile);

    if (uploadError) throw uploadError;

    // Store encrypted file metadata in database
    const { error: dbError } = await supabase
      .from('encrypted_files')
      .insert({
        file_id: fileId,
        user_id: user.id,
        encrypted_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        encrypted_metadata: JSON.stringify(encryptedMetadata),
        expires_at: expiresAt,
        max_downloads: maxDownloads,
        download_count: 0,
        storage_path: `${user.id}/${fileId}`
      });

    if (dbError) throw dbError;

    // Encrypt file key and IV with user's master key
    const keyBuffer = Buffer.from(key, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    
    // Generate a random IV for encrypting the file key/IV
    const masterKeyIv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedKey = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: masterKeyIv },
      userKey,
      keyBuffer
    );
    
    const encryptedIv = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: masterKeyIv },
      userKey,
      ivBuffer
    );

    // Create file metadata with encrypted keys
    const fileMetadata: EncryptedFileMetadata = {
      id: Date.now().toString(),
      fileId,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toISOString(),
      expiresAt,
      maxDownloads,
      downloadCount: 0,
      encryptedKey: Buffer.from(encryptedKey).toString('base64'),
      encryptedIv: Buffer.from(encryptedIv).toString('base64')
    };

    // Update user's encrypted file list
    await updateUserFileList(user.id, password, fileMetadata, Buffer.from(masterKeyIv).toString('base64'));

    // Generate download URL
    const downloadUrl = `${window.location.origin}/download/${fileId}?key=${encodeURIComponent(key)}&iv=${encodeURIComponent(iv)}`;

    return { fileId, downloadUrl };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Get user's encrypted file list (returns EncryptedFileMetadata with encrypted keys)
export async function getUserFileList(): Promise<EncryptedFileMetadata[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  try {
    // Get encrypted file list from database
    const { data: indexData, error: indexError } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list, salt, iv')
      .eq('user_id', user.id)
      .maybeSingle();

    if (indexError) throw indexError;
    if (!indexData || !indexData.encrypted_file_list || !indexData.salt) {
      return []; // Return empty array if no file list found
    }

    // Decrypt the file list to get EncryptedFileMetadata with encrypted keys
    const decryptedList = await decryptFileList(indexData.encrypted_file_list, 'dummy-password', indexData.salt);
    return decryptedList;
  } catch (error) {
    console.error('Error getting user file list:', error);
    return [];
  }
}

// Get user's file list with decrypted keys for UI display
export async function getDecryptedFileList(userKey: CryptoKey): Promise<DecryptedFileMetadata[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  try {
    // Get encrypted file list from database
    const { data: indexData, error: indexError } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list, salt, iv')
      .eq('user_id', user.id)
      .maybeSingle();

    if (indexError) throw indexError;
    if (!indexData || !indexData.encrypted_file_list || !indexData.salt) {
      return []; // Return empty array if no file list found
    }

    // Decrypt the file list to get EncryptedFileMetadata
    const encryptedFileList = await decryptFileList(indexData.encrypted_file_list, 'dummy-password', indexData.salt);
    
    // Now decrypt individual file keys for UI display
    const decryptedList: DecryptedFileMetadata[] = await Promise.all(
      encryptedFileList.map(async (file) => {
        try {
          // Use the stored IV for decrypting file keys
          const masterKeyIv = new Uint8Array(Buffer.from(indexData.iv || '', 'base64'));
          
          // Decrypt file key and IV using user's master key
          const keyBytes = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: masterKeyIv },
            userKey,
            Buffer.from(file.encryptedKey, 'base64')
          );
          
          const ivBytes = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: masterKeyIv },
            userKey,
            Buffer.from(file.encryptedIv, 'base64')
          );
          
          const { encryptedKey, encryptedIv, ...fileWithoutEncrypted } = file;
          
          return {
            ...fileWithoutEncrypted,
            key: Buffer.from(keyBytes).toString('base64'),
            iv: Buffer.from(ivBytes).toString('base64')
          };
        } catch (error) {
          console.error('Error decrypting file keys:', error);
          // Return file without decrypted keys if decryption fails
          const { encryptedKey, encryptedIv, ...fileWithoutEncrypted } = file;
          return {
            ...fileWithoutEncrypted,
            key: 'Decryption failed',
            iv: 'Decryption failed'
          };
        }
      })
    );
    
    return decryptedList;
  } catch (error) {
    console.error('Error getting decrypted file list:', error);
    return [];
  }
}

// Update user's encrypted file list
async function updateUserFileList(userId: string, password: string, newFile: EncryptedFileMetadata, masterKeyIv: string): Promise<void> {
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
        existingFiles = await decryptFileList(
          existingData.encrypted_file_list,
          password,
          existingData.salt
        );
      } catch (decryptError) {
        console.error('Error decrypting existing file list:', decryptError);
        existingFiles = [];
      }
    }

    // Add new file to the list (avoid duplicates by fileId)
    const updatedFiles = existingFiles.filter(file => file.fileId !== newFile.fileId);
    updatedFiles.push(newFile);

    // Encrypt updated file list
    const { encryptedList, salt } = await encryptFileList(updatedFiles, password);

    // Store in database
    await supabase
      .from('user_file_index')
      .upsert({
        user_id: userId,
        encrypted_file_list: encryptedList,
        salt: salt,
        iv: masterKeyIv
      }, {
        onConflict: 'user_id'
      });
  } catch (error) {
    console.error('Error updating file list:', error);
    throw error;
  }
}

// Delete a file
export async function deleteFile(fileId: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('encrypted-files')
      .remove([`${user.id}/${fileId}`]);

    if (storageError) throw storageError;

    // Delete from database
    const { error: dbError } = await supabase
      .from('encrypted_files')
      .delete()
      .eq('file_id', fileId)
      .eq('user_id', user.id);

    if (dbError) throw dbError;

    // Update user's file list (remove the deleted file)
    // This would require password but we'll skip this for now
    // In a real implementation, you'd need to handle this properly
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

// Download a file
export async function downloadFile(fileId: string, key: string, iv: string): Promise<void> {
  try {
    // Get current download count and increment it
    const { data: currentData } = await supabase
      .from('encrypted_files')
      .select('download_count')
      .eq('file_id', fileId)
      .single();
    
    const newCount = (currentData?.download_count || 0) + 1;
    
    const { error: updateError } = await supabase
      .from('encrypted_files')
      .update({ download_count: newCount })
      .eq('file_id', fileId);

    if (updateError) throw updateError;

    // Download from storage
    const { data, error } = await supabase.storage
      .from('encrypted-files')
      .download(fileId);

    if (error) throw error;
    if (!data) throw new Error('No file data received');

    // Decrypt file
    const arrayBuffer = await data.arrayBuffer();
    const keyBuffer = Buffer.from(key, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      cryptoKey,
      arrayBuffer
    );

    // Get original filename from database
    const { data: fileData } = await supabase
      .from('encrypted_files')
      .select('encrypted_filename')
      .eq('file_id', fileId)
      .single();

    const filename = fileData?.encrypted_filename || 'downloaded-file';

    // Trigger download
    const blob = new Blob([decryptedBuffer]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}