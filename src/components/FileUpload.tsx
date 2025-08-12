import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileCheck, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { uploadEncryptedFile } from '@/lib/fileManager';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{ fileId: string; downloadUrl: string } | null>(null);
  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [customExpiry, setCustomExpiry] = useState<string>('');
  const [expiryMode, setExpiryMode] = useState<'preset' | 'custom'>('preset');
  const [maxDownloads, setMaxDownloads] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    console.log('Starting file upload for:', file.name, 'size:', file.size);

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      console.log('File size validation failed:', file.size, 'vs max:', maxSize);
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive"
      });
      return;
    }

    // Proceed directly with upload
    await performUpload(file);
  };


  const performUpload = async (file: File) => {
    console.log('File validation passed, starting upload process...');
    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      console.log('Starting encryption and upload...');
      // Simulate progress during encryption
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 80));
      }, 200);

      // Calculate final expiry days
      const finalExpiryDays = expiryMode === 'custom' 
        ? parseInt(customExpiry) || 0
        : expiryDays;

      console.log('Calling uploadEncryptedFile with params:', {
        fileName: file.name,
        expiryDays: finalExpiryDays > 0 ? finalExpiryDays : undefined,
        maxDownloads: maxDownloads > 0 ? maxDownloads : undefined
      });

      const result = await uploadEncryptedFile(
        file,
        finalExpiryDays > 0 ? finalExpiryDays : undefined,
        maxDownloads > 0 ? maxDownloads : undefined
      );

      console.log('Upload completed successfully:', result);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResult(result);

      toast({
        title: "File uploaded successfully!",
        description: `${file.name} has been encrypted and uploaded securely.`
      });

      onUploadComplete?.();

      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        error: error
      });
      
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Download link has been copied"
      });
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const openDownloadLink = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Upload Encrypted File
        </CardTitle>
        <CardDescription>
          Files are encrypted client-side before upload using AES-GCM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isUploading && !uploadResult && (
          <>
            {/* Upload Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry</Label>
                <div className="space-y-2">
                  <select
                    id="expiry-mode"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={expiryMode}
                    onChange={(e) => setExpiryMode(e.target.value as 'preset' | 'custom')}
                  >
                    <option value="preset">Preset Options</option>
                    <option value="custom">Custom Days</option>
                  </select>
                  
                  {expiryMode === 'preset' ? (
                    <select
                      id="expiry"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                    >
                      <option value={0}>Never expires</option>
                      <option value={1}>1 day</option>
                      <option value={7}>1 week</option>
                      <option value={30}>1 month</option>
                      <option value={90}>3 months</option>
                      <option value={365}>1 year</option>
                    </select>
                  ) : (
                    <Input
                      id="custom-expiry"
                      type="number"
                      min="0"
                      max="3650"
                      value={customExpiry}
                      onChange={(e) => setCustomExpiry(e.target.value)}
                      placeholder="0 for never expires, or enter days"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="downloads">Max Downloads</Label>
                <Input
                  id="downloads"
                  type="number"
                  min="0"
                  max="1000"
                  value={maxDownloads}
                  onChange={(e) => setMaxDownloads(parseInt(e.target.value) || 0)}
                  placeholder="0 for unlimited"
                />
              </div>
            </div>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Drop your file here or click to browse
              </h3>
              <p className="text-muted-foreground mb-4">
                Maximum file size: 100MB
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="security-glow"
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Security Notice */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-500 mb-1">Zero-Trust Encryption</p>
                  <p className="text-blue-400">
                    Your file is encrypted in your browser using AES-GCM before upload. 
                    The encryption key never leaves your device and is embedded in the download URL.
                    We never see your unencrypted data.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">
                {uploadProgress < 80 ? 'Encrypting file...' : 'Uploading...'}
              </span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-500">
              <FileCheck className="w-5 h-5" />
              <span className="font-medium">File uploaded successfully!</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">File ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                    {uploadResult.fileId}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(uploadResult.fileId)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Secure Download Link</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={uploadResult.downloadUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(uploadResult.downloadUrl)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDownloadLink(uploadResult.downloadUrl)}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-500 mb-1">Secure Sharing</p>
                  <p className="text-green-400">
                    Share this link with anyone you trust. The encryption key is embedded 
                    in the URL fragment and never sent to our servers.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setUploadResult(null)}
              className="w-full"
            >
            Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};