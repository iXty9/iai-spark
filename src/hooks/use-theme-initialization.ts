
import { useEffect, useState } from 'react';
import { initializationService } from '@/services/config/initialization-service';
import { logger } from '@/utils/logging';

export const useThemeInitialization = () => {
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const isReady = initializationService.isReady();
        const status = initializationService.getStatus();
        
        setIsClientReady(status.hasConnection);
        setIsThemeReady(isReady);
        setThemeError(null);
        
        logger.info('Theme initialization status updated', { 
          module: 'theme-init',
          isReady,
          hasConnection: status.hasConnection
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setThemeError(errorMessage);
        logger.error('Theme initialization failed', error, { module: 'theme-init' });
      }
    };

    checkInitialization();
    
    // Poll for changes
    const interval = setInterval(checkInitialization, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    isThemeReady,
    themeError,
    isClientReady,
    initializationPhase: isThemeReady ? 'complete' : 'loading'
  };
};
