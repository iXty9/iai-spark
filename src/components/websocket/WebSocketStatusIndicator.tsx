
import React, { useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Info, Wifi, WifiOff, Circle, AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import { StatusIndicatorConfig, RealtimeStatus } from '@/types/websocket';

interface WebSocketStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const getStatusConfig = (isEnabled: boolean, realtimeStatus: RealtimeStatus): StatusIndicatorConfig => {
  if (!isEnabled) {
    return {
      color: 'bg-destructive',
      tooltip: 'Real-time messaging is disabled',
      status: 'Disabled',
      variant: 'destructive'
    };
  }
  
  switch (realtimeStatus) {
    case 'connected':
      return {
        color: 'bg-green-500',
        tooltip: 'Connected to real-time updates',
        status: 'Connected',
        variant: 'default'
      };
    case 'connecting':
      return {
        color: 'bg-yellow-500',
        tooltip: 'Connecting to real-time updates...',
        status: 'Connecting',
        variant: 'secondary'
      };
    case 'error':
      return {
        color: 'bg-destructive',
        tooltip: 'Real-time connection failed',
        status: 'Error',
        variant: 'destructive'
      };
    default:
      return {
        color: 'bg-muted-foreground',
        tooltip: 'Real-time status unknown',
        status: 'Disconnected',
        variant: 'secondary'
      };
  }
};

const getStatusIcon = (isEnabled: boolean, realtimeStatus: RealtimeStatus) => {
  if (!isEnabled) return WifiOff;
  
  switch (realtimeStatus) {
    case 'connected':
      return Wifi;
    case 'connecting':
      return Activity;
    case 'error':
      return AlertTriangle;
    default:
      return WifiOff;
  }
};

export const WebSocketStatusIndicator: React.FC<WebSocketStatusIndicatorProps> = ({ 
  className = '',
  showDetails = false 
}) => {
  const { 
    isConnected, 
    isEnabled, 
    connectionId, 
    realtimeStatus, 
    forceReconnect,
    diagnostics 
  } = useWebSocket();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const statusConfig = getStatusConfig(isEnabled, realtimeStatus);
  const StatusIcon = getStatusIcon(isEnabled, realtimeStatus);

  const handleForceReconnect = async () => {
    setIsReconnecting(true);
    try {
      await forceReconnect();
    } finally {
      setIsReconnecting(false);
    }
  };

  const isDevEnvironment = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('.local')
  );

  const diagnosticInfo = {
    enabled: isEnabled,
    connected: isConnected,
    realtimeStatus,
    connectionId: connectionId || 'None',
    timestamp: new Date().toLocaleString(),
    channels: diagnostics.channelsActive,
    environment: isDevEnvironment ? 'Development' : 'Production',
    lastConnectionAttempt: diagnostics.lastConnectionAttempt,
    connectionAttempts: diagnostics.connectionAttempts,
    lastError: diagnostics.lastError
  };

  if (!showDetails) {
    return (
      <div className={className}>
        <div 
          className={`w-2 h-2 rounded-full ${statusConfig.color}`}
          title={statusConfig.tooltip}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8">
            <Circle className={`w-2 h-2 ${statusConfig.color.replace('bg-', 'fill-')} rounded-full`} />
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm">{statusConfig.status}</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              WebSocket Connection Diagnostics
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Connection Status
                  <Button 
                    onClick={handleForceReconnect} 
                    disabled={isReconnecting}
                    size="sm"
                    variant="outline"
                  >
                    {isReconnecting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Force Reconnect
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Realtime Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={realtimeStatus === 'connected' ? 'default' : 'secondary'}>
                        {realtimeStatus}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Connection ID</label>
                    <p className="text-sm mt-1 font-mono">{diagnosticInfo.connectionId}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Environment</label>
                    <p className="text-sm mt-1">{diagnosticInfo.environment}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Active Channels</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {diagnosticInfo.channels.length > 0 ? (
                      diagnosticInfo.channels.map(channel => (
                        <Badge key={channel} variant="outline">{channel}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No active channels</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Connection Attempts</label>
                    <p className="text-sm mt-1">{diagnosticInfo.connectionAttempts}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Attempt</label>
                    <p className="text-sm mt-1">
                      {diagnosticInfo.lastConnectionAttempt 
                        ? new Date(diagnosticInfo.lastConnectionAttempt).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>

                {diagnosticInfo.lastError && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Error</label>
                    <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md mt-1">
                      <p className="text-sm text-destructive font-mono">{diagnosticInfo.lastError}</p>
                    </div>
                  </div>
                )}
                
                {realtimeStatus === 'error' && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">
                      WebSocket connection failed. This may be due to network issues, 
                      Supabase configuration problems, or realtime service unavailability.
                      Try the "Force Reconnect" button above.
                    </p>
                  </div>
                )}
                
                {realtimeStatus === 'connecting' && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      WebSocket is attempting to connect. This may take up to 30 seconds.
                      Check the browser console for detailed connection logs.
                    </p>
                  </div>
                )}

                {realtimeStatus === 'connected' && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      WebSocket is connected and ready to receive real-time messages and notifications.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
