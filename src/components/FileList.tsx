import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Share2, Trash2, RefreshCw, File, Calendar, Database, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getUserFileList, deleteEncryptedFile, downloadEncryptedFile, getStoredPassword, setPassword } from '@/lib/fileManager';
import { generateDownloadUrl } from '@/lib/encryption';
import { PasswordPrompt } from '@/components/PasswordPrompt';
import type { EncryptedFileMetadata } from '@/lib/fileManager';

interface FileListProps {
  refreshTrigger?: number;
}

export function FileList({ refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<EncryptedFileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordError, setPasswordError] = useState<string>('');

  const loadFiles = async (password?: string) => {
    setLoading(true);
    try {
      // Check if we have a password
      let userPassword = password || await getStoredPassword();
      
      if (!userPassword) {
        setShowPasswordPrompt(true);
        setLoading(false);
        return;
      }

      const fileList = await getUserFileList(userPassword);
      setFiles(fileList);
      setPasswordError('');
    } catch (error) {
      console.error('Error loading files:', error);
      if (error instanceof Error && error.message.includes('Invalid password')) {
        setPasswordError('Invalid password. Please try again.');
        setShowPasswordPrompt(true);
      } else {
        toast.error('Failed to load files');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    try {
      await setPassword(password);
      await loadFiles(password);
      setShowPasswordPrompt(false);
    } catch (error) {
      setPasswordError('Invalid password or failed to decrypt files');
      throw error; // Re-throw to keep dialog open
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordPrompt(false);
    setPasswordError('');
  };

  useEffect(() => {
    loadFiles();
  }, [refreshTrigger]);

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(fileId);
      await deleteEncryptedFile(fileId);
      toast.success('File deleted successfully');
      await loadFiles(); // Reload the file list
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (file: EncryptedFileMetadata) => {
    try {
      setDownloading(file.fileId);
      await downloadEncryptedFile(file.fileId, file.key, file.iv);
      toast.success(`Download started: ${file.originalName}`);
      await loadFiles(); // Reload to update download count
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async (file: EncryptedFileMetadata) => {
    try {
      const downloadUrl = generateDownloadUrl(file.fileId, file.key, file.iv);
      await navigator.clipboard.writeText(downloadUrl);
      toast.success('Download link copied to clipboard');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to copy link');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isNearExpiry = (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return expiry < threeDaysFromNow && expiry > now;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary mr-2" />
          <span>Loading your files...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            Your Encrypted Files
          </CardTitle>
          <CardDescription>
            Files are encrypted client-side with zero-trust security. Only you can decrypt them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No files found</h3>
              <p className="text-muted-foreground">
                Upload your first encrypted file to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file) => (
                <div 
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <File className="w-5 h-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{file.originalName}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {file.downloadCount} downloads
                          {file.maxDownloads && ` / ${file.maxDownloads}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(file.uploadDate)}
                        </span>
                        {file.expiresAt && (
                          <span className={`flex items-center gap-1 ${
                            isExpired(file.expiresAt) ? 'text-destructive' : 
                            isNearExpiry(file.expiresAt) ? 'text-yellow-500' : ''
                          }`}>
                            <Clock className="w-3 h-3" />
                            Expires {formatDate(file.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isExpired(file.expiresAt) && (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Expired
                      </Badge>
                    )}
                    
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      disabled={isExpired(file.expiresAt) || downloading === file.fileId}
                    >
                      {downloading === file.fileId ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(file)}
                      disabled={isExpired(file.expiresAt)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(file.fileId)}
                      disabled={deleting === file.fileId}
                      className="text-destructive hover:text-destructive"
                    >
                      {deleting === file.fileId ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <Separator className="my-6" />
          
          <Button
            variant="outline"
            onClick={() => loadFiles()}
            disabled={loading}
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh File List
          </Button>
        </CardContent>
      </Card>

      <PasswordPrompt
        isOpen={showPasswordPrompt}
        onPasswordSubmit={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
        title="Unlock Your Files"
        description="Enter your password to decrypt and view your file list. This ensures zero-trust security - your files are never stored unencrypted."
        error={passwordError}
      />
    </div>
  );
}