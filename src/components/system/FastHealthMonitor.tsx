
import { useEffect, useState } from 'react';
import { coordinatedInitService, InitializationStatus } from '@/services/initialization/coordinated-init-service';
import { logger } from '@/utils/logging';

export function FastHealthMonitor() {
  // Only run in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const [status, setStatus] = useState<InitializationStatus | null>(null);

  useEffect(() => {
    let healthCheckInterval: NodeJS.Timeout;

    const performHealthCheck = () => {
      const currentStatus = coordinatedInitService.getStatus();
      setStatus(currentStatus);
      
      if (!currentStatus.isComplete && currentStatus.error) {
        logger.warn('Health check detected issue', {
          module: 'fast-health-monitor',
          status: currentStatus
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
      {status && (
        <div className={`px-2 py-1 rounded ${
          status.isComplete
            ? 'bg-green-100 text-green-800' 
            : status.error
            ? 'bg-red-100 text-red-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          Status: {status.phase.toUpperCase()}
          {status.error && ` (${status.error})`}
        </div>
      )}
    </div>
  );
}
