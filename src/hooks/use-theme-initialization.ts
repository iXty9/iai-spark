
import { useEffect, useState } from 'react';
import { themeService } from '@/services/theme-service';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

export const useThemeInitialization = () => {
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    const initializeThemeSystem = async () => {
      try {
        logger.info('Starting theme system initialization', { module: 'theme-init' });
        
        // Phase 1: Ensure Supabase client is ready
        let clientReady = false;
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!clientReady && attempts < maxAttempts) {
          try {
            const { data, error } = await supabase.auth.getSession();
            if (error && error.message.includes('not available')) {
              await new Promise(resolve => setTimeout(resolve, 100));
              attempts++;
              continue;
            }
            clientReady = true;
            setIsClientReady(true);
            logger.info('Supabase client ready for theme initialization', { module: 'theme-init' });
          } catch (error) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
        }

        if (!clientReady) {
          logger.warn('Proceeding with theme init without client readiness', { module: 'theme-init' });
        }

        // Phase 2: Initialize theme service
        await themeService.initialize({
          enableTransitions: true,
          fallbackToDefaults: true,
          persistToLocalStorage: true
        });

        // Phase 3: Mark theme as ready
        setIsThemeReady(true);
        
        // Add ready class to body to prevent FOUC
        document.body.classList.add('theme-ready');
        
        logger.info('Theme system initialized successfully', { 
          module: 'theme-init',
          clientReady
        });
      } catch (error) {
        logger.error('Failed to initialize theme system:', error, { module: 'theme-init' });
        setThemeError(error instanceof Error ? error.message : 'Unknown theme error');
        
        // Still mark as ready to prevent infinite loading
        setIsThemeReady(true);
        document.body.classList.add('theme-ready');
      }
    };

    initializeThemeSystem();
  }, []);

  return {
    isThemeReady,
    themeError,
    isClientReady,
    themeService
  };
};
