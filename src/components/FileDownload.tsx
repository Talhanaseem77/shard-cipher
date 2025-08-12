import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Lock, AlertTriangle, FileX, Loader2 } from 'lucide-react';
import { downloadEncryptedFile, getUserFileList } from '@/lib/fileManager';
import { parseUrlFragment, base64ToArrayBuffer } from '@/lib/encryption';
import { PasswordPrompt } from '@/components/PasswordPrompt';

export const FileDownload: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Parse encryption parameters from URL fragment
    try {
      const { key, iv } = parseUrlFragment();
      
      if (!key || !iv) {
        setError('Invalid download link - encryption keys missing');
        return;
      }

      // Test if the keys are valid base64 by trying to decode them
      base64ToArrayBuffer(key);
      base64ToArrayBuffer(iv);
      
    } catch (err) {
      console.error('Invalid URL keys:', err);
      setError('Invalid download link - encryption keys are corrupted');
    }
  }, []);

  const handleDownload = async () => {
    // Show password prompt first
    setShowPasswordPrompt(true);
  };

  const handleDownloadWithPassword = async (password: string) => {
    if (!fileId) {
      setError('File ID not found');
      return;
    }

    const { key, iv } = parseUrlFragment();
    if (!key || !iv) {
      setError('Encryption keys not found in URL');
      return;
    }

    try {
      setDownloading(true);
      setError(null);
      setShowPasswordPrompt(false);
      
      // Verify password by trying to decrypt file list
      await getUserFileList(password);
      
      // If password is correct, proceed with download
      await downloadEncryptedFile(fileId, key, iv);
      
      toast({
        title: "Download started",
        description: "File is being decrypted and downloaded"
      });
    } catch (error: any) {
      console.error('Download error:', error);
      if (error.message.includes('Incorrect password') || error.message.includes('Invalid password')) {
        toast({
          title: "Download failed",
          description: "Incorrect password. Please try again.",
          variant: "destructive"
        });
        // Reopen password prompt for retry
        setShowPasswordPrompt(true);
      } else {
        setError(error.message || 'Download failed');
        toast({
          title: "Download failed",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6 text-center">
            <FileX className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Download Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-sm text-left">
                  <p className="font-medium text-destructive mb-1">Possible Issues:</p>
                  <ul className="text-destructive/80 space-y-1">
                    <li>• File may have expired</li>
                    <li>• Download limit exceeded</li>
                    <li>• Invalid or corrupted link</li>
                    <li>• File has been deleted</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
      <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            Secure File Download
          </CardTitle>
          <CardDescription>
            This file is encrypted with AES-GCM. It will be decrypted in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-4">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">File ID: {fileId}</span>
            </div>
          </div>

          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full security-glow"
            size="lg"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Decrypting & Downloading...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download File
              </>
            )}
          </Button>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-500 mb-1">Zero-Trust Security</p>
                <p className="text-blue-400">
                  This file is encrypted and will be decrypted locally in your browser. 
                  The encryption keys are embedded in this URL and never sent to our servers.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Powered by ZettlerShare - Zero-Trust File Sharing
            </p>
          </div>
        </CardContent>
      </Card>
      
      <PasswordPrompt
        isOpen={showPasswordPrompt}
        onSubmit={handleDownloadWithPassword}
        onCancel={() => setShowPasswordPrompt(false)}
        title="Verify Download"
        description="Enter your password to verify and download this file:"
      />
    </div>
  );
};