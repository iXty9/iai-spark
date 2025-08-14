import { useState, useEffect } from 'react';
import { applicationModeService, ApplicationMode } from '@/services/admin/applicationModeService';
import { logger } from '@/utils/logging';

/**
 * Hook to get and manage the current application mode
 */
export function useApplicationMode() {
  const [mode, setMode] = useState<ApplicationMode>('production');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMode = async () => {
      try {
        const currentMode = await applicationModeService.getApplicationMode();
        setMode(currentMode);
      } catch (error) {
        logger.error('Failed to load application mode in hook', error, { module: 'use-application-mode' });
        setMode('production'); // Default fallback
      } finally {
        setIsLoading(false);
      }
    };

    loadMode();

    // Listen for mode changes
    const handleModeChange = (event: CustomEvent) => {
      const newMode = event.detail.mode as ApplicationMode;
      setMode(newMode);
      logger.info('Application mode changed via event', { newMode }, { module: 'use-application-mode' });
    };

    window.addEventListener('applicationModeChanged', handleModeChange as EventListener);

    return () => {
      window.removeEventListener('applicationModeChanged', handleModeChange as EventListener);
    };
  }, []);

  return {
    mode,
    isLoading,
    isDevelopmentMode: mode === 'development',
    isProductionMode: mode === 'production',
  };
}