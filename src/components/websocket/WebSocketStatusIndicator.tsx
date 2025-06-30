
import React, { useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Info, Wifi, WifiOff, Circle, AlertTriangle } from 'lucide-react';

interface WebSocketStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const WebSocketStatusIndicator: React.FC<WebSocketStatusIndicatorProps> = ({ 
  className = '',
  showDetails = false 
}) => {
  const { isConnected, isEnabled, connectionId } = useWebSocket();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getStatusIndicator = () => {
    if (!isEnabled) {
      return {
        color: 'bg-red-500',
        tooltip: 'Real-time messaging is disabled',
        icon: WifiOff,
        status: 'Disabled',
        variant: 'destructive' as const
      };
    } else if (isConnected) {
      return {
        color: 'bg-green-500',
        tooltip: 'Connected to real-time updates',
        icon: Wifi,
        status: 'Connected',
        variant: 'default' as const
      };
    } else {
      return {
        color: 'bg-yellow-500',
        tooltip: 'Real-time messaging enabled but connecting...',
        icon: AlertTriangle,
        status: 'Connecting',
        variant: 'secondary' as const
      };
    }
  };

  const statusIndicator = getStatusIndicator();
  const StatusIcon = statusIndicator.icon;

  const diagnosticInfo = {
    enabled: isEnabled,
    connected: isConnected,
    connectionId: connectionId || 'None',
    timestamp: new Date().toLocaleString(),
    channels: isConnected ? ['proactive-messages', 'toast-notifications'] : [],
    environment: window.location.hostname === 'localhost' ? 'Development' : 'Production',
    websocketStatus: isEnabled ? (isConnected ? 'Connected' : 'Connecting') : 'Disabled'
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
        
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              WebSocket Connection Diagnostics
            </DialogTitle>
          </DialogHeader>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connection Status</CardTitle>
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
                  <label className="text-sm font-medium text-muted-foreground">Enabled</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isEnabled ? 'default' : 'secondary'}>
                      {isEnabled ? 'Yes' : 'No'}
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
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Checked</label>
                <p className="text-sm mt-1">{diagnosticInfo.timestamp}</p>
              </div>
              
              {isEnabled && !isConnected && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    WebSocket is enabled but not connected. The system is attempting to connect or reconnect.
                    Check the browser console for detailed connection logs.
                  </p>
                </div>
              )}
              
              {!isEnabled && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    Real-time messaging is disabled. Enable it in the Admin Panel Real-time Messaging settings.
                  </p>
                </div>
              )}

              {isEnabled && isConnected && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    WebSocket is connected and ready to receive real-time messages and notifications.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
};
