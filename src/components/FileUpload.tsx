import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { uploadEncryptedFile, getStoredPassword, setPassword } from '@/lib/fileManager';
import { PasswordPrompt } from '@/components/PasswordPrompt';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [expiryDays, setExpiryDays] = useState<string>('7');
  const [maxDownloads, setMaxDownloads] = useState<string>('10');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordError, setPasswordError] = useState<string>('');

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (100MB limit)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File size too large. Maximum size is 100MB.');
        return;
      }
      setSelectedFile(file);
      setDownloadUrl('');
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      // Check file size (100MB limit)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File size too large. Maximum size is 100MB.');
        return;
      }
      setSelectedFile(file);
      setDownloadUrl('');
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleUpload = async (password?: string) => {
    if (!selectedFile) return;

    // Check if we have a password
    const userPassword = password || await getStoredPassword();
    if (!userPassword) {
      setShowPasswordPrompt(true);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setDownloadUrl('');

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const expiry = expiryDays === 'never' ? undefined : parseInt(expiryDays);
      const maxDl = maxDownloads === 'unlimited' ? undefined : parseInt(maxDownloads);

      const result = await uploadEncryptedFile(selectedFile, expiry, maxDl);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setDownloadUrl(result.downloadUrl);
      toast.success('File uploaded successfully!');
      
      // Reset form after successful upload
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        setDownloadUrl('');
        onUploadComplete?.();
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof Error && error.message.includes('Password required')) {
        setPasswordError('Password required for file encryption');
        setShowPasswordPrompt(true);
      } else {
        toast.error('Failed to upload file');
      }
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    try {
      await setPassword(password);
      setShowPasswordPrompt(false);
      setPasswordError('');
      await handleUpload(password);
    } catch (error) {
      setPasswordError('Failed to set password');
      throw error;
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordPrompt(false);
    setPasswordError('');
  };

  const removeFile = () => {
    setSelectedFile(null);
    setDownloadUrl('');
  };

  const copyToClipboard = async () => {
    if (downloadUrl) {
      try {
        await navigator.clipboard.writeText(downloadUrl);
        toast.success('Download URL copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy URL');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Encrypted File
          </CardTitle>
          <CardDescription>
            Files are encrypted client-side before upload using AES-GCM encryption
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Selection */}
          <div>
            <Label htmlFor="file">Select File</Label>
            <div
              className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {selectedFile ? (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removeFile}
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    Drag and drop your file here
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse (max 100MB)
                  </p>
                  <Button variant="outline">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                    />
                    Choose File
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Upload Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiry">File Expiry</Label>
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="7">1 Week</SelectItem>
                  <SelectItem value="30">1 Month</SelectItem>
                  <SelectItem value="90">3 Months</SelectItem>
                  <SelectItem value="never">Never Expires</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="downloads">Max Downloads</Label>
              <Select value={maxDownloads} onValueChange={setMaxDownloads}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Download</SelectItem>
                  <SelectItem value="5">5 Downloads</SelectItem>
                  <SelectItem value="10">10 Downloads</SelectItem>
                  <SelectItem value="25">25 Downloads</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Success Message */}
          {downloadUrl && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">File uploaded successfully!</span>
              </div>
              
              <div className="space-y-2">
                <Label>Secure Download URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={downloadUrl} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button onClick={copyToClipboard} variant="outline">
                    Copy
                  </Button>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800 mb-1">
                      Secure sharing enabled
                    </p>
                    <p className="text-green-700">
                      The encryption key is embedded in the URL fragment and never leaves your browser.
                      Share this link safely with anyone you trust.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Button */}
          {selectedFile && !downloadUrl && (
            <Button
              onClick={() => handleUpload()}
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </>
              )}
            </Button>
          )}

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 mb-1">
                  Zero-trust encryption
                </p>
                <p className="text-blue-700">
                  Your files are encrypted in your browser before upload. 
                  Set custom expiration times or choose no expiry for permanent storage.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PasswordPrompt
        isOpen={showPasswordPrompt}
        onPasswordSubmit={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
        title="Set Encryption Password"
        description="Enter a password to encrypt your files. This password will be required to access your file list and download files."
        error={passwordError}
      />
    </div>
  );
}