import { supabase } from '@/integrations/supabase/client';

// Client-side encryption for file index using Web Crypto API
export class SecureFileIndex {
  private static async generateSalt(): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private static async deriveKey(password: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt + 'file_index_encryption'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptFileList(fileList: any[], password: string): Promise<{ encryptedData: string; salt: string; iv: string }> {
    const salt = await this.generateSalt();
    const key = await this.deriveKey(password, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(fileList));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return {
      encryptedData: Array.from(new Uint8Array(encrypted), byte => byte.toString(16).padStart(2, '0')).join(''),
      salt,
      iv: Array.from(iv, byte => byte.toString(16).padStart(2, '0')).join('')
    };
  }

  static async decryptFileList(encryptedData: string, password: string, salt: string, iv: string): Promise<any[]> {
    const key = await this.deriveKey(password, salt);
    
    const ivBytes = new Uint8Array(iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const dataBytes = new Uint8Array(encryptedData.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      dataBytes
    );
    
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decrypted);
    return JSON.parse(jsonString);
  }

  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  }
}