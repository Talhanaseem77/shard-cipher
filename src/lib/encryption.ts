// Client-side encryption utilities using Web Crypto API
// All encryption/decryption happens in the browser - zero-trust architecture

export interface EncryptionResult {
  encryptedData: ArrayBuffer;
  key: CryptoKey;
  iv: Uint8Array;
}

export interface DecryptionParams {
  encryptedData: ArrayBuffer;
  key: CryptoKey;
  iv: Uint8Array;
}

export interface FileEncryptionResult {
  encryptedFile: ArrayBuffer;
  encryptedMetadata: string;
  key: string; // Base64 encoded key for URL fragment
  iv: string; // Base64 encoded IV
}

// Generate a random AES-GCM key for file encryption
export async function generateFileKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

// Generate a password-derived key using PBKDF2
export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Generate a random salt
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

// Generate a random IV for AES-GCM
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

// Encrypt data with AES-GCM
export async function encryptData(data: ArrayBuffer, key: CryptoKey): Promise<EncryptionResult> {
  const iv = generateIV();
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    data
  );

  return {
    encryptedData,
    key,
    iv
  };
}

// Decrypt data with AES-GCM
export async function decryptData(params: DecryptionParams): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: params.iv
    },
    params.key,
    params.encryptedData
  );
}

// Encrypt a file and its metadata
export async function encryptFile(file: File): Promise<FileEncryptionResult> {
  const key = await generateFileKey();
  const iv = generateIV();
  
  // Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer();
  
  // Encrypt file content
  const encryptedFile = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    fileBuffer
  );

  // Prepare metadata
  const metadata = {
    originalName: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    encryptedAt: Date.now()
  };

  // Encrypt metadata
  const metadataString = JSON.stringify(metadata);
  const metadataBuffer = new TextEncoder().encode(metadataString);
  const encryptedMetadataBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    metadataBuffer
  );

  // Export key and IV as base64 for URL fragment
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const keyBase64 = arrayBufferToBase64(exportedKey);
  const ivBase64 = arrayBufferToBase64(iv);

  return {
    encryptedFile,
    encryptedMetadata: arrayBufferToBase64(encryptedMetadataBuffer),
    key: keyBase64,
    iv: ivBase64
  };
}

// Decrypt a file and metadata
export async function decryptFile(
  encryptedFile: ArrayBuffer,
  encryptedMetadata: string,
  keyBase64: string,
  ivBase64: string
): Promise<{ file: Blob; metadata: any }> {
  // Import key and IV from base64
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    'AES-GCM',
    false,
    ['decrypt']
  );

  // Decrypt file content
  const decryptedFile = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encryptedFile
  );

  // Decrypt metadata
  const encryptedMetadataBuffer = base64ToArrayBuffer(encryptedMetadata);
  const decryptedMetadataBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encryptedMetadataBuffer
  );

  const metadataString = new TextDecoder().decode(decryptedMetadataBuffer);
  const metadata = JSON.parse(metadataString);

  // Create blob with original MIME type
  const blob = new Blob([decryptedFile], { type: metadata.type });

  return { file: blob, metadata };
}

// Encrypt user's file list with password-derived key
export async function encryptFileList(fileList: any[], password: string, salt?: Uint8Array): Promise<{ encryptedList: string; salt: string }> {
  const saltToUse = salt || generateSalt();
  const key = await deriveKeyFromPassword(password, saltToUse);
  const iv = generateIV();

  const listString = JSON.stringify(fileList);
  const listBuffer = new TextEncoder().encode(listString);
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    listBuffer
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  return {
    encryptedList: arrayBufferToBase64(combined),
    salt: arrayBufferToBase64(saltToUse)
  };
}

// Decrypt user's file list with password-derived key
export async function decryptFileList(encryptedList: string, password: string, saltBase64: string): Promise<any[]> {
  const salt = new Uint8Array(base64ToArrayBuffer(saltBase64));
  const key = await deriveKeyFromPassword(password, salt);
  
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedList));
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encryptedData
  );

  const listString = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(listString);
}

// Utility functions
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate download URL with encryption key in fragment
export function generateDownloadUrl(fileId: string, key: string, iv: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/f/${fileId}#key=${key}&iv=${iv}`;
}

// Parse encryption parameters from URL fragment
export function parseUrlFragment(): { key?: string; iv?: string } {
  const fragment = window.location.hash.substring(1);
  const params = new URLSearchParams(fragment);
  
  return {
    key: params.get('key') || undefined,
    iv: params.get('iv') || undefined
  };
}