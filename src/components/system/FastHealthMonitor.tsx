
import { useEffect, useState } from 'react';
import { fastBootstrap, FastBootstrapStatus } from '@/services/bootstrap/fast-bootstrap-service';
import { logger } from '@/utils/logging';

export function FastHealthMonitor() {
  const [status, setStatus] = useState<FastBootstrapStatus | null>(null);

  useEffect(() => {
    // Light health monitoring - only in development and much less frequent
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    let healthCheckInterval: NodeJS.Timeout;

    const performHealthCheck = () => {
      const currentStatus = fastBootstrap.getStatus();
      setStatus(currentStatus);
      
      if (!currentStatus.isReady && currentStatus.error) {
        logger.warn('Health check detected issue', {
          module: 'fast-health-monitor',
          status: currentStatus
        });
      }
    };

    // Initial check
    performHealthCheck();
    
    // Very infrequent checks (every 5 minutes) to avoid performance impact
    healthCheckInterval = setInterval(performHealthCheck, 300000);

    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, []);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed top-2 left-2 z-30 text-xs">
      {status && (
        <div className={`px-2 py-1 rounded ${
          status.isReady
            ? 'bg-green-100 text-green-800' 
            : status.needsSetup
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          Status: {status.phase.toUpperCase()}
          {status.error && ` (${status.error})`}
        </div>
      )}
    </div>
  );
}
