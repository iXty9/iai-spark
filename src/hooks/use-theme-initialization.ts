
import { useEffect, useState } from 'react';
import { themeService } from '@/services/theme-service';
import { logger } from '@/utils/logging';

export const useThemeInitialization = () => {
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTheme = async () => {
      try {
        logger.info('Initializing theme system', { module: 'theme-init' });
        
        // Initialize theme service first
        await themeService.initialize({
          enableTransitions: true,
          fallbackToDefaults: true,
          persistToLocalStorage: true
        });

        // Mark theme as ready
        setIsThemeReady(true);
        
        // Add ready class to body to prevent FOUC
        document.body.classList.add('theme-ready');
        
        logger.info('Theme system initialized successfully', { module: 'theme-init' });
      } catch (error) {
        logger.error('Failed to initialize theme system:', error, { module: 'theme-init' });
        setThemeError(error instanceof Error ? error.message : 'Unknown theme error');
        
        // Still mark as ready to prevent infinite loading
        setIsThemeReady(true);
        document.body.classList.add('theme-ready');
      }
    };

    initializeTheme();
  }, []);

  return {
    isThemeReady,
    themeError,
    themeService
  };
};
