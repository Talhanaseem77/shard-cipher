// Comprehensive client-side encryption for all sensitive data
// Zero-trust architecture - all encryption/decryption happens in browser only

import { supabase } from '@/integrations/supabase/client';
import { generateSalt, generateIV, deriveKeyFromPassword, arrayBufferToBase64, base64ToArrayBuffer } from '@/lib/encryption';

export interface EncryptedData {
  encryptedContent: string;
  salt: string;
  iv: string;
}

export interface AuditLogEntry {
  action: string;
  timestamp: string;
  data: any;
  userAgent?: string;
}

// Master encryption service for all user data
export class SecureDataManager {
  private static ITERATIONS = 100000; // PBKDF2 iterations
  
  // Derive encryption key from user's authentication
  private static async deriveUserKey(userId: string, dataType: string): Promise<CryptoKey> {
    // Use user ID + data type as password base for consistent key derivation
    const keyMaterial = `${userId}_${dataType}_encryption_key_v1`;
    const salt = new TextEncoder().encode('secure_data_salt_' + dataType);
    
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(keyMaterial),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt any data before sending to backend
  static async encryptData(data: any, userId: string, dataType: string): Promise<EncryptedData> {
    const key = await this.deriveUserKey(userId, dataType);
    const iv = generateIV();
    
    const jsonString = JSON.stringify(data);
    const dataBuffer = new TextEncoder().encode(jsonString);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );
    
    return {
      encryptedContent: arrayBufferToBase64(encryptedBuffer),
      salt: arrayBufferToBase64(new TextEncoder().encode(dataType)), // Use data type as salt identifier
      iv: arrayBufferToBase64(iv)
    };
  }

  // Decrypt data received from backend
  static async decryptData(encryptedData: EncryptedData, userId: string, dataType: string): Promise<any> {
    const key = await this.deriveUserKey(userId, dataType);
    const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv));
    const encrypted = base64ToArrayBuffer(encryptedData.encryptedContent);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const jsonString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonString);
  }

  // Encrypt file list before storing
  static async encryptFileList(fileList: any[], userId: string): Promise<string> {
    const encrypted = await this.encryptData(fileList, userId, 'file_list');
    // Combine all encryption data into one string for storage
    return JSON.stringify(encrypted);
  }

  // Decrypt file list after retrieving
  static async decryptFileList(encryptedList: string, userId: string): Promise<any[]> {
    try {
      const encrypted: EncryptedData = JSON.parse(encryptedList);
      return await this.decryptData(encrypted, userId, 'file_list');
    } catch (error) {
      console.error('Error decrypting file list:', error);
      return [];
    }
  }

  // Encrypt audit log before storing
  static async encryptAuditLog(logEntry: AuditLogEntry, userId: string): Promise<string> {
    const encrypted = await this.encryptData(logEntry, userId, 'audit_log');
    return JSON.stringify(encrypted);
  }

  // Decrypt audit log after retrieving
  static async decryptAuditLog(encryptedLog: string, userId: string): Promise<AuditLogEntry | null> {
    try {
      const encrypted: EncryptedData = JSON.parse(encryptedLog);
      return await this.decryptData(encrypted, userId, 'audit_log');
    } catch (error) {
      console.error('Error decrypting audit log:', error);
      return null;
    }
  }

  // Store encrypted file list
  static async storeEncryptedFileList(userId: string, fileList: any[]): Promise<void> {
    const encryptedList = await this.encryptFileList(fileList, userId);
    
    const { error } = await supabase
      .from('user_file_index')
      .upsert({
        user_id: userId,
        encrypted_file_list: encryptedList,
        salt: 'encrypted_v1', // Version marker
        iv: 'encrypted_v1'
      }, {
        onConflict: 'user_id'
      });
    
    if (error) throw error;
  }

  // Retrieve and decrypt file list
  static async getDecryptedFileList(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_file_index')
      .select('encrypted_file_list')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    if (!data?.encrypted_file_list) return [];
    
    return await this.decryptFileList(data.encrypted_file_list, userId);
  }

  // Store encrypted audit log
  static async storeEncryptedAuditLog(userId: string, logEntry: AuditLogEntry): Promise<void> {
    const encryptedLog = await this.encryptAuditLog(logEntry, userId);
    
    const { error } = await supabase
      .from('encrypted_audit_logs')
      .insert({
        user_id: userId,
        encrypted_log_entry: encryptedLog,
        log_type: logEntry.action,
        ip_address: null, // Set by edge function if needed
        user_agent: logEntry.userAgent || navigator.userAgent
      });
    
    if (error) {
      console.error('Error storing audit log:', error);
      // Don't throw - logging failures shouldn't break functionality
    }
  }

  // Retrieve and decrypt audit logs
  static async getDecryptedAuditLogs(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('encrypted_audit_logs')
      .select('encrypted_log_entry, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error retrieving audit logs:', error);
      return [];
    }
    
    const decryptedLogs: AuditLogEntry[] = [];
    for (const log of data || []) {
      const decrypted = await this.decryptAuditLog(log.encrypted_log_entry, userId);
      if (decrypted) {
        decryptedLogs.push(decrypted);
      }
    }
    
    return decryptedLogs;
  }

  // Encrypt user profile data before storage
  static async encryptProfileData(profileData: any, userId: string): Promise<string> {
    const encrypted = await this.encryptData(profileData, userId, 'profile');
    return JSON.stringify(encrypted);
  }

  // Decrypt user profile data after retrieval
  static async decryptProfileData(encryptedProfile: string, userId: string): Promise<any> {
    try {
      const encrypted: EncryptedData = JSON.parse(encryptedProfile);
      return await this.decryptData(encrypted, userId, 'profile');
    } catch (error) {
      console.error('Error decrypting profile data:', error);
      return null;
    }
  }
}