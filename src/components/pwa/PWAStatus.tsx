import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';

export const PWAStatus: React.FC = () => {
  const { isOnline, isInstalled } = usePWA();

  return (
    <div className="flex items-center gap-2">
      {isInstalled && (
        <Badge variant="secondary" className="text-xs">
          App Mode
        </Badge>
      )}
      <div className="flex items-center gap-1">
        {isOnline ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        <span className="text-xs text-muted-foreground">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );
};