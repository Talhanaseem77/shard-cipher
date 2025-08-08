import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    // Trigger file list refresh
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold gradient-text">ZettlerShare</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your encrypted files with zero-trust security
          </p>
        </div>

        {/* File Upload Section */}
        <div className="mb-8">
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>

        {/* File List Section */}
        <FileList refreshTrigger={refreshTrigger} />

        {/* Security Notice */}
        <Card className="mt-8 bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Zero-Trust Architecture</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                All files are encrypted client-side using AES-GCM before upload. 
                Encryption keys are embedded in download URLs and never stored on our servers. 
                Your data remains private with end-to-end encryption.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};