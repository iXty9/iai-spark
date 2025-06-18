
import { useEffect, useState } from 'react';
import { coordinatedInitService, InitializationStatus } from '@/services/initialization/coordinated-init-service';
import { logger } from '@/utils/logging';

export const useThemeInitialization = () => {
  const [status, setStatus] = useState<InitializationStatus>(() => coordinatedInitService.getStatus());
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    const unsubscribe = coordinatedInitService.subscribe((newStatus) => {
      setStatus(newStatus);
      
      // Update derived states
      setIsClientReady(newStatus.phase === 'complete' || newStatus.phase === 'theme');
      setIsThemeReady(newStatus.isComplete);
      setThemeError(newStatus.error || null);
      
      logger.info('Theme initialization status updated', { 
        module: 'theme-init',
        phase: newStatus.phase,
        isComplete: newStatus.isComplete,
        error: newStatus.error
      });
    });

    return unsubscribe;
  }, []);

  return {
    isThemeReady,
    themeError,
    isClientReady,
    initializationPhase: status.phase
  };
};
