import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { 
  File, 
  Download, 
  Share2, 
  Trash2, 
  Copy, 
  Clock, 
  Lock,
  AlertTriangle,
  RefreshCw,
  Key,
  Eye
} from 'lucide-react';
import { getUserFileList, deleteEncryptedFile, downloadEncryptedFile, type EncryptedFileMetadata } from '@/lib/fileManager';
import { generateDownloadUrl } from '@/lib/encryption';

interface FileListProps {
  refreshTrigger?: number;
}

export const FileList: React.FC<FileListProps> = ({ refreshTrigger }) => {
  const [files, setFiles] = useState<EncryptedFileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const loadFiles = async () => {
    try {
      setLoading(true);
      const fileList = await getUserFileList();
      setFiles(fileList);
    } catch (error: any) {
      console.error('Error loading files:', error);
      toast({
        title: "Error loading files",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [refreshTrigger]);

  const handleDeleteClick = (fileId: string, fileName: string) => {
    setFileToDelete({ id: fileId, name: fileName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      setDeleting(fileToDelete.id);
      await deleteEncryptedFile(fileToDelete.id);
      setFiles(prev => prev.filter(file => file.fileId !== fileToDelete.id));
      toast({
        title: "File deleted",
        description: "The file has been permanently deleted"
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleDownload = async (file: EncryptedFileMetadata) => {
    try {
      setDownloading(file.fileId);
      await downloadEncryptedFile(file.fileId, file.key, file.iv);
      
      // Refresh the file list to update download count
      await loadFiles();
      
      toast({
        title: "Download started",
        description: `${file.originalName} is being downloaded`
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async (file: EncryptedFileMetadata) => {
    try {
      const downloadUrl = generateDownloadUrl(file.fileId, file.key, file.iv);
      await navigator.clipboard.writeText(downloadUrl);
      toast({
        title: "Link copied",
        description: "Secure download link has been copied to clipboard"
      });
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Copy failed",
        description: "Could not copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleCopyKey = async (key: string, iv: string, fileName: string) => {
    try {
      const keyInfo = `File: ${fileName}\nDecryption Key: ${key}\nIV: ${iv}`;
      await navigator.clipboard.writeText(keyInfo);
      toast({
        title: "Decryption info copied",
        description: "File decryption key and IV have been copied to clipboard"
      });
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        title: "Copy failed",
        description: "Could not copy decryption info to clipboard",
        variant: "destructive"
      });
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
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-primary mr-2" />
            <span>Loading your files...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <File className="w-5 h-5" />
          Your Encrypted Files ({files.length})
        </CardTitle>
        <CardDescription>
          All files are encrypted with AES-GCM. Decryption keys are shown below and embedded in download URLs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-12">
            <File className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No files uploaded yet</h3>
            <p className="text-muted-foreground">
              Upload your first encrypted file to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div 
                key={file.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/30"
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
                        <Clock className="w-3 h-3" />
                        {formatDate(file.uploadDate)}
                      </span>
                      {file.expiresAt && (
                        <span className={`flex items-center gap-1 ${
                          isExpired(file.expiresAt) ? 'text-destructive' : 
                          isNearExpiry(file.expiresAt) ? 'text-yellow-500' : ''
                        }`}>
                          Expires {formatDate(file.expiresAt)}
                        </span>
                      )}
                    </div>
                    
                    {/* Decryption Keys Display */}
                    <div className="mt-2 p-2 bg-muted/30 rounded border text-xs space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Key className="w-3 h-3" />
                        <span className="font-medium">Decryption Key:</span>
                      </div>
                      <div className="font-mono break-all text-xs">{file.key}</div>
                      <div className="flex items-center gap-1 text-muted-foreground mt-1">
                        <span className="font-medium">IV:</span>
                      </div>
                      <div className="font-mono break-all text-xs">{file.iv}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isExpired(file.expiresAt) ? (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Expired
                    </Badge>
                  ) : isNearExpiry(file.expiresAt) ? (
                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                      <Clock className="w-3 h-3 mr-1" />
                      Expiring Soon
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                      <Lock className="w-3 h-3 mr-1" />
                      Encrypted
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
                    onClick={() => handleCopyKey(file.key, file.iv, file.originalName)}
                    title="Copy decryption key and IV"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(file.fileId, file.originalName)}
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
        
        {files.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={loadFiles}
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh File List
            </Button>
          </div>
        )}
      </CardContent>
      
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        fileName={fileToDelete?.name || ''}
        isDeleting={deleting === fileToDelete?.id}
      />
    </Card>
  );
};