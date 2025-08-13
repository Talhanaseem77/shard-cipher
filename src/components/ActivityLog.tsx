import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Upload, Download, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SecureDataManager, type AuditLogEntry } from '@/lib/secureDataManager';

// Using AuditLogEntry from SecureDataManager for encrypted logs

export const ActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityLogs();
  }, []);

  const loadActivityLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use secure decryption to get audit logs - all encryption happens in browser
      const decryptedLogs = await SecureDataManager.getDecryptedAuditLogs(user.id, 20);
      setLogs(decryptedLogs);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload':
        return <Upload className="w-4 h-4" />;
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'upload':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'download':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'delete':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Activity className="w-6 h-6 animate-pulse text-primary mr-2" />
            <span>Loading activity logs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Log ({logs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No activity yet</h3>
            <p className="text-muted-foreground">
              Your file activity will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, index) => (
              <div 
                key={`${log.timestamp}-${index}`}
                className="flex items-center justify-between p-3 border border-border rounded-lg bg-background/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                      {log.data?.fileName && (
                        <span className="text-sm font-medium">{log.data.fileName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                </div>
                
                {log.data?.fileSize && (
                  <div className="text-sm text-muted-foreground">
                    {(log.data.fileSize / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};