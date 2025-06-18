
import { useEffect, useState } from 'react';
import { initializationService } from '@/services/config/initialization-service';
import { logger } from '@/utils/logging';

export function FastHealthMonitor() {
  // Only run in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let healthCheckInterval: NodeJS.Timeout;

    const performHealthCheck = async () => {
      try {
        const isSystemReady = initializationService.isReady();
        setIsReady(isSystemReady);
        setError(null);
        
        if (!isSystemReady) {
          logger.warn('Health check detected system not ready', {
            module: 'fast-health-monitor'
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        logger.warn('Health check detected issue', {
          module: 'fast-health-monitor',
          error: errorMessage
        });
      }
    };

    performHealthCheck();
    healthCheckInterval = setInterval(performHealthCheck, 300000); // 5 minutes

    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, []);

  return (
    <div className="fixed top-2 left-2 z-30 text-xs">
      <div className={`px-2 py-1 rounded ${
        isReady
          ? 'bg-green-100 text-green-800' 
          : error
          ? 'bg-red-100 text-red-800'
          : 'bg-amber-100 text-amber-800'
      }`}>
        Status: {isReady ? 'READY' : error ? 'ERROR' : 'LOADING'}
        {error && ` (${error})`}
      </div>
    </div>
  );
}
