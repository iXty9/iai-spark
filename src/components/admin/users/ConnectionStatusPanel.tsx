
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Settings, Info } from 'lucide-react';

interface ConnectionStatusProps {
  error: string;
  connectionStatus: any;
  onRetry: () => void;
  onOpenEnvironmentSettings: () => void;
}

export function ConnectionStatusPanel({
  error,
  connectionStatus,
  onRetry,
  onOpenEnvironmentSettings
}: ConnectionStatusProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Failed to load users</h3>
        <p className="mb-6 text-muted-foreground">{error}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onRetry} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
          <Button 
            onClick={onOpenEnvironmentSettings} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" /> Environment Settings
          </Button>
        </div>
        
        {connectionStatus && (
          <div className="mt-8 text-left w-full max-w-md bg-muted/30 p-4 rounded-md text-sm">
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <Info className="h-4 w-4" /> Connection Diagnostics
            </h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>Connection: {connectionStatus.isConnected ? '✓ Connected' : '✗ Not connected'}</li>
              <li>Authentication: {connectionStatus.isAuthenticated ? '✓ Authenticated' : '✗ Not authenticated'}</li>
              <li>Admin Access: {connectionStatus.isAdmin ? '✓ Admin privileges' : '✗ No admin privileges'}</li>
              <li>Admin Functions: {connectionStatus.functionAvailable ? '✓ Available' : '✗ Not available'}</li>
              <li>Environment ID: {connectionStatus.environmentInfo?.environmentId || 'unknown'}</li>
              <li>URL: {connectionStatus.environmentInfo?.url || 'not set'}</li>
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
