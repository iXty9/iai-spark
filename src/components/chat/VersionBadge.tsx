import React, { useState, useEffect } from 'react';
import { getBuildInfoFromSiteConfig } from '@/utils/site-config-utils';

export const VersionBadge: React.FC = () => {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const buildInfo = await getBuildInfoFromSiteConfig();
        setVersion(buildInfo.version);
      } catch (error) {
        // Fallback to default version
        setVersion('0.9.0-beta.1');
      }
    };

    loadVersion();
  }, []);

  if (!version) return null;

  return (
    <div className="text-center mt-1 -mb-1">
      <span 
        className="text-xs text-muted-foreground/60 font-light tracking-wider"
        style={{ 
          textShadow: '0 1px 2px rgba(0,0,0,0.05)',
          letterSpacing: '0.025em'
        }}
      >
        v{version}
      </span>
    </div>
  );
};