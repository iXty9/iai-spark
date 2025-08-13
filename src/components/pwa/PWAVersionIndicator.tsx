
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { usePWA } from '@/hooks/use-pwa';
import { versionService } from '@/services/pwa/versionService';

export const PWAVersionIndicator: React.FC = () => {
  const { needsUpdate } = usePWA();
  const [versionInfo, setVersionInfo] = useState<{hash: string, version: string, env: string} | null>(null);

  useEffect(() => {
    const loadVersion = async () => {
      const version = await versionService.getCurrentVersion();
      if (version) {
        setVersionInfo({
          hash: version.buildHash,
          version: version.version,
          env: version.environment || 'unknown'
        });
      }
    };
    loadVersion();
  }, []);

  if (!versionInfo) return null;

  const displayHash = versionInfo.env === 'development' 
    ? versionInfo.hash 
    : versionInfo.hash.slice(0, 8);

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={needsUpdate ? "destructive" : "secondary"} 
        className="text-xs font-mono"
      >
        v{displayHash}
        {needsUpdate && " (update)"}
      </Badge>
    </div>
  );
};
