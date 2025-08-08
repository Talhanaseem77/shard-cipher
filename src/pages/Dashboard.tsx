import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  File, 
  Share2, 
  Trash2, 
  Download, 
  Lock, 
  Clock,
  Shield,
  Plus
} from "lucide-react";
import { Navigation } from "@/components/ui/navigation";

// Mock data for demonstration
const mockFiles = [
  {
    id: "1",
    name: "Financial_Report_Q4.pdf",
    size: "2.4 MB",
    uploadDate: "2024-01-15",
    downloads: 3,
    expires: "2024-02-15",
    encrypted: true
  },
  {
    id: "2", 
    name: "Project_Proposal.docx",
    size: "856 KB",
    uploadDate: "2024-01-14",
    downloads: 8,
    expires: "2024-02-14",
    encrypted: true
  },
  {
    id: "3",
    name: "Confidential_Data.zip",
    size: "15.2 MB", 
    uploadDate: "2024-01-13",
    downloads: 1,
    expires: "2024-02-13",
    encrypted: true
  }
];

export default function Dashboard() {
  const [files] = useState(mockFiles);

  const handleUpload = () => {
    // TODO: Implement file upload
    console.log("Upload file");
  };

  const handleShare = (fileId: string) => {
    // TODO: Implement file sharing
    console.log("Share file:", fileId);
  };

  const handleDelete = (fileId: string) => {
    // TODO: Implement file deletion
    console.log("Delete file:", fileId);
  };

  const totalStorage = files.reduce((acc, file) => {
    const sizeInMB = parseFloat(file.size.replace(/[^\d.]/g, ''));
    return acc + (file.size.includes('KB') ? sizeInMB / 1024 : sizeInMB);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your encrypted files securely
            </p>
          </div>
          
          <Button onClick={handleUpload} className="security-glow">
            <Plus className="w-4 h-4 mr-2" />
            Upload File
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{files.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Storage Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStorage.toFixed(1)} MB</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {files.reduce((acc, file) => acc + file.downloads, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-500">Secure</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Files List */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="w-5 h-5" />
              Your Files
            </CardTitle>
            <CardDescription>
              All files are encrypted with AES-GCM before upload
            </CardDescription>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No files uploaded yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by uploading your first encrypted file
                </p>
                <Button onClick={handleUpload} className="security-glow">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Your First File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <File className="w-5 h-5 text-primary" />
                      </div>
                      
                      <div>
                        <h4 className="font-medium">{file.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{file.size}</span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {file.downloads} downloads
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires {new Date(file.expires).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <Lock className="w-3 h-3 mr-1" />
                        Encrypted
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShare(file.id)}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}