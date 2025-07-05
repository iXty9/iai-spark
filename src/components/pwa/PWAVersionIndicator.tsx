
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { usePWA } from '@/hooks/use-pwa';

export const PWAVersionIndicator: React.FC = () => {
  const { currentVersion, needsUpdate } = usePWA();

  if (!currentVersion) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={needsUpdate ? "destructive" : "secondary"} 
        className="text-xs font-mono"
      >
        v{currentVersion.slice(0, 8)}
        {needsUpdate && " (update)"}
      </Badge>
    </div>
  );
};
