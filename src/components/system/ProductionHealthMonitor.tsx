
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { unifiedBootstrap, UnifiedBootstrapStatus } from '@/services/bootstrap/unified-bootstrap-service';
import { logger } from '@/utils/logging';
import { toast } from '@/hooks/use-toast';

export function ProductionHealthMonitor() {
  const { user } = useAuth();
  const [lastHealthCheck, setLastHealthCheck] = useState<UnifiedBootstrapStatus | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  useEffect(() => {
    let healthCheckInterval: NodeJS.Timeout;

    const performHealthCheck = async () => {
      try {
        const status = await unifiedBootstrap.getStatus();
        setLastHealthCheck(status);

        if (!status.isReady || status.errors.length > 0) {
          setConsecutiveFailures(prev => prev + 1);
          
          // Log health issues but don't spam
          if (consecutiveFailures < 3) {
            logger.warn('Unified health check failed', {
              module: 'health-monitor',
              status,
              consecutiveFailures: consecutiveFailures + 1
            });
          }

          // Auto-recovery attempt after 3 consecutive failures
          if (consecutiveFailures >= 2) {
            logger.info('Attempting automatic recovery after health failures', {
              module: 'health-monitor',
              consecutiveFailures: consecutiveFailures + 1
            });
            
            try {
              const recoverySuccess = await unifiedBootstrap.performRecovery();
              if (recoverySuccess) {
                setConsecutiveFailures(0);
                
                if (process.env.NODE_ENV === 'development') {
                  toast({
                    title: "System Recovery",
                    description: "Automatic recovery completed successfully.",
                    duration: 3000,
                  });
                }
              }
            } catch (error) {
              logger.error('Automatic recovery failed', error, { module: 'health-monitor' });
            }
          }
        } else {
          // Reset failure counter on successful health check
          if (consecutiveFailures > 0) {
            setConsecutiveFailures(0);
            logger.info('System health restored', { module: 'health-monitor' });
          }
        }

        // Auto-update static config when user is authenticated and system is healthy
        if (user && status.isReady) {
          const lastUpdate = localStorage.getItem('last_static_update');
          const now = Date.now();
          const oneHour = 60 * 60 * 1000;
          
          if (!lastUpdate || (now - new Date(lastUpdate).getTime()) > oneHour) {
            logger.info('Performing scheduled static config update', { module: 'health-monitor' });
            await unifiedBootstrap.updateStaticConfiguration();
          }
        }

      } catch (error) {
        logger.error('Health check error', error, { module: 'health-monitor' });
        setConsecutiveFailures(prev => prev + 1);
      }
    };

    // Initial health check
    performHealthCheck();
    
    // Periodic health checks (every 30 seconds in development, 2 minutes in production)
    const interval = process.env.NODE_ENV === 'development' ? 30000 : 120000;
    healthCheckInterval = setInterval(performHealthCheck, interval);

    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [user, consecutiveFailures]);

  // This component doesn't render anything visible in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Show health status in development
  return (
    <div className="fixed top-2 left-2 z-30 text-xs">
      {lastHealthCheck && (
        <div className={`px-2 py-1 rounded ${
          lastHealthCheck.isReady && lastHealthCheck.errors.length === 0
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          Health: {lastHealthCheck.isReady ? 'OK' : 'FAIL'} 
          {lastHealthCheck.errors.length > 0 && ` (${lastHealthCheck.errors.length} errors)`}
          {consecutiveFailures > 0 && ` (${consecutiveFailures} failures)`}
          <div className="text-xs opacity-75">
            Services: {Object.values(lastHealthCheck.services).filter(Boolean).length}/5
          </div>
        </div>
      )}
    </div>
  );
}
