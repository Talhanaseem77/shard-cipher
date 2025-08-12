import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { ActivityLog } from "@/components/ActivityLog";

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

        {/* Activity Log Section */}
        <div className="mb-8">
          <ActivityLog />
        </div>

      </div>
    </div>
  );
};