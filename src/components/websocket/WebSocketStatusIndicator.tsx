
import React, { useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Info, Wifi, WifiOff, Circle, AlertTriangle, RefreshCw, Activity } from 'lucide-react';

interface WebSocketStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

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

  const getStatusIndicator = () => {
    if (!isEnabled) {
      return {
        color: 'bg-red-500',
        tooltip: 'Real-time messaging is disabled',
        icon: WifiOff,
        status: 'Disabled',
        variant: 'destructive' as const
      };
    }
    
    switch (realtimeStatus) {
      case 'connected':
        return {
          color: 'bg-green-500',
          tooltip: 'Connected to real-time updates',
          icon: Wifi,
          status: 'Connected',
          variant: 'default' as const
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          tooltip: 'Connecting to real-time updates...',
          icon: Activity,
          status: 'Connecting',
          variant: 'secondary' as const
        };
      case 'error':
        return {
          color: 'bg-red-500',
          tooltip: 'Real-time connection failed',
          icon: AlertTriangle,
          status: 'Error',
          variant: 'destructive' as const
        };
      default:
        return {
          color: 'bg-gray-500',
          tooltip: 'Real-time status unknown',
          icon: WifiOff,
          status: 'Disconnected',
          variant: 'secondary' as const
        };
    }
  };

  const handleForceReconnect = async () => {
    setIsReconnecting(true);
    try {
      await forceReconnect();
    } finally {
      setIsReconnecting(false);
    }
  };

  const statusIndicator = getStatusIndicator();
  const StatusIcon = statusIndicator.icon;

  const diagnosticInfo = {
    enabled: isEnabled,
    connected: isConnected,
    realtimeStatus,
    connectionId: connectionId || 'None',
    timestamp: new Date().toLocaleString(),
    channels: diagnostics.channelsActive,
    environment: window.location.hostname === 'localhost' ? 'Development' : 'Production',
    lastConnectionAttempt: diagnostics.lastConnectionAttempt,
    connectionAttempts: diagnostics.connectionAttempts,
    lastError: diagnostics.lastError
  };

  if (!showDetails) {
    return (
      <div className={`${className}`}>
        <div 
          className={`w-2 h-2 rounded-full ${statusIndicator.color}`}
          title={statusIndicator.tooltip}
        />
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8">
            <Circle className={`w-2 h-2 ${statusIndicator.color.replace('bg-', 'fill-')} rounded-full`} />
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm">{statusIndicator.status}</span>
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
                      <Badge variant={statusIndicator.variant}>
                        {statusIndicator.status}
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
                    <div className="p-2 bg-red-50 border border-red-200 rounded-md mt-1">
                      <p className="text-sm text-red-800 font-mono">{diagnosticInfo.lastError}</p>
                    </div>
                  </div>
                )}
                
                {realtimeStatus === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">
                      WebSocket connection failed. This may be due to network issues, 
                      Supabase configuration problems, or realtime service unavailability.
                      Try the "Force Reconnect" button above.
                    </p>
                  </div>
                )}
                
                {realtimeStatus === 'connecting' && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      WebSocket is attempting to connect. This may take up to 30 seconds.
                      Check the browser console for detailed connection logs.
                    </p>
                  </div>
                )}

                {realtimeStatus === 'connected' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
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
