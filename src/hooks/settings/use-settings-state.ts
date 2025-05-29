
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors } from '@/types/theme';
import { logger } from '@/utils/logging';
import { productionThemeService } from '@/services/production-theme-service';
import { backgroundStateManager } from '@/services/background-state-manager';

export interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

export const useSettingsState = () => {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo>({});
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Local state that mirrors the production theme service
  const [localState, setLocalState] = useState(() => productionThemeService.getState());
  const [backgroundState, setBackgroundState] = useState(() => backgroundStateManager.getState());

  // Initialize settings when profile data is available
  useEffect(() => {
    const initializeSettings = async () => {
      if (isInitialized) return;

      try {
        setIsLoading(true);

        // Initialize theme service with profile data if available
        if (profile?.theme_settings) {
          try {
            const userSettings = JSON.parse(profile.theme_settings);
            await productionThemeService.initialize(userSettings);
            logger.info('Settings initialized from profile', { 
              module: 'settings',
              backgroundImage: !!userSettings.backgroundImage,
              backgroundOpacity: userSettings.backgroundOpacity
            });
          } catch (parseError) {
            logger.error('Failed to parse theme settings:', parseError, { module: 'settings' });
            await productionThemeService.initialize();
          }
        } else {
          await productionThemeService.initialize();
        }

        // Wait for service to be ready
        let attempts = 0;
        const maxAttempts = 50;
        while (!productionThemeService.getState().isReady && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        // Sync local state
        const themeState = productionThemeService.getState();
        setLocalState(themeState);
        setIsInitialized(true);
        setIsLoading(false);
        
        logger.info('Settings state initialized successfully', { 
          module: 'settings',
          backgroundImage: !!themeState.backgroundImage,
          backgroundOpacity: themeState.backgroundOpacity
        });
      } catch (error) {
        logger.error('Error initializing settings:', error, { module: 'settings' });
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeSettings();
  }, [profile?.theme_settings, isInitialized]);

  // Subscribe to service changes
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribeTheme = productionThemeService.subscribe((newState) => {
      setLocalState(newState);
      logger.info('Settings state updated from service', { 
        module: 'settings',
        backgroundImage: !!newState.backgroundImage,
        backgroundOpacity: newState.backgroundOpacity
      });
    });

    const unsubscribeBackground = backgroundStateManager.subscribe((newBackgroundState) => {
      setBackgroundState(newBackgroundState);
      logger.info('Background state updated', { 
        module: 'settings',
        isApplied: newBackgroundState.isApplied,
        hasImage: !!newBackgroundState.image,
        error: newBackgroundState.lastError
      });
    });

    return () => {
      unsubscribeTheme();
      unsubscribeBackground();
    };
  }, [isInitialized]);

  // Wrapper functions to track changes and update service immediately
  const updateLightTheme = (newTheme: ThemeColors) => {
    setLocalState(prev => ({ ...prev, lightTheme: newTheme }));
    productionThemeService.setLightTheme(newTheme);
    setHasChanges(true);
    logger.info('Light theme updated', { module: 'settings' });
  };
  
  const updateDarkTheme = (newTheme: ThemeColors) => {
    setLocalState(prev => ({ ...prev, darkTheme: newTheme }));
    productionThemeService.setDarkTheme(newTheme);
    setHasChanges(true);
    logger.info('Dark theme updated', { module: 'settings' });
  };
  
  const updateBackgroundImage = (image: string | null, info?: ImageInfo) => {
    productionThemeService.setBackgroundImage(image);
    if (info) {
      setImageInfo(info);
    }
    setHasChanges(true);
    logger.info('Background image updated in settings', { module: 'settings', hasImage: !!image });
  };
  
  const updateBackgroundOpacity = (opacity: number) => {
    productionThemeService.setBackgroundOpacity(opacity);
    setHasChanges(true);
    logger.info('Background opacity updated in settings', { module: 'settings', opacity });
  };

  return {
    lightTheme: localState.lightTheme,
    darkTheme: localState.darkTheme,
    backgroundImage: backgroundState.image,
    backgroundOpacity: backgroundState.opacity,
    isSubmitting,
    isLoading,
    hasChanges,
    imageInfo,
    setLightTheme: updateLightTheme,
    setDarkTheme: updateDarkTheme,
    setBackgroundImage: updateBackgroundImage,
    setBackgroundOpacity: updateBackgroundOpacity,
    setIsSubmitting,
    setHasChanges,
    setImageInfo: (info: ImageInfo) => setImageInfo(info),
    isInitialized,
    backgroundError: backgroundState.lastError,
    isBackgroundApplied: backgroundState.isApplied
  };
};
