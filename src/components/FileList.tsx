import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
  Eye,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { getDecryptedFileList, deleteFile, downloadFile, type DecryptedFileMetadata } from '@/lib/fileManager';
import { generateDownloadUrl } from '@/lib/encryption';

interface FileListProps {
  refreshTrigger?: number;
}

export const FileList: React.FC<FileListProps> = ({ refreshTrigger }) => {
  const [files, setFiles] = useState<DecryptedFileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { userKey } = useAuth();

  const loadFiles = async () => {
    if (!userKey) return;
    
    try {
      setLoading(true);
      const fileList = await getDecryptedFileList(userKey);
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
      await deleteFile(fileToDelete.id);
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

  const handleDownload = async (file: DecryptedFileMetadata) => {
    try {
      setDownloading(file.fileId);
      await downloadFile(file.fileId, file.key, file.iv);
      
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

  const handleShare = async (file: DecryptedFileMetadata) => {
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

  const toggleFileExpansion = (fileId: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
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
          <div className="space-y-3">
            {files.map((file) => {
              const isExpanded = expandedFiles.has(file.fileId);
              return (
                <div 
                  key={file.id}
                  className="border border-border rounded-xl bg-gradient-to-r from-background/90 to-background/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* Main File Info Row */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
                        <File className="w-5 h-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground truncate">{file.originalName}</h4>
                          {isExpired(file.expiresAt) ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Expired
                            </Badge>
                          ) : isNearExpiry(file.expiresAt) ? (
                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Expiring Soon
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Encrypted
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground mt-1">
                          <span className="font-medium">{formatFileSize(file.size)}</span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {file.downloadCount}
                            {file.maxDownloads && ` / ${file.maxDownloads}`} downloads
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(file.uploadDate)}
                          </span>
                          {file.expiresAt && !isExpired(file.expiresAt) && (
                            <span className="flex items-center gap-1">
                              Expires {formatDate(file.expiresAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFileExpansion(file.fileId)}
                        className="p-2"
                        title="Show decryption keys"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        disabled={isExpired(file.expiresAt) || downloading === file.fileId}
                        className="gap-1"
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
                        title="Share secure download link"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyKey(file.key, file.iv, file.originalName)}
                        title="Copy decryption info"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(file.fileId, file.originalName)}
                        disabled={deleting === file.fileId}
                        className="text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/30"
                      >
                        {deleting === file.fileId ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Decryption Keys Section */}
                  {isExpanded && (
                    <div className="border-t border-border/50 bg-muted/20 rounded-b-xl">
                      <div className="p-4 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Key className="w-4 h-4" />
                          Decryption Information
                        </div>
                        
                        <div className="grid gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Decryption Key
                              </label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(file.key)}
                                className="h-6 px-2 text-xs"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <div className="p-3 bg-background/50 border border-border/50 rounded-lg">
                              <code className="text-xs font-mono break-all text-foreground/80 leading-relaxed">
                                {file.key}
                              </code>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Initialization Vector (IV)
                              </label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(file.iv)}
                                className="h-6 px-2 text-xs"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <div className="p-3 bg-background/50 border border-border/50 rounded-lg">
                              <code className="text-xs font-mono break-all text-foreground/80 leading-relaxed">
                                {file.iv}
                              </code>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-border/30">
                          <p className="text-xs text-muted-foreground">
                            These keys are required to decrypt your file. Store them securely or use the share link which embeds them automatically.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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