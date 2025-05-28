
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors } from '@/types/theme';
import { logger } from '@/utils/logging';
import { unifiedThemeController } from '@/services/unified-theme-controller';
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
  
  // Local state that mirrors the unified controller
  const [localState, setLocalState] = useState(() => unifiedThemeController.getState());
  const [backgroundState, setBackgroundState] = useState(() => backgroundStateManager.getState());

  // Initialize settings when profile data is available
  useEffect(() => {
    const initializeSettings = async () => {
      if (isInitialized) return;

      try {
        setIsLoading(true);

        // Wait for controller to be ready
        let attempts = 0;
        const maxAttempts = 50;
        while (!unifiedThemeController.initialized && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!unifiedThemeController.initialized) {
          // Initialize controller with profile data if available
          if (profile?.theme_settings) {
            try {
              const userSettings = JSON.parse(profile.theme_settings);
              await unifiedThemeController.initialize(userSettings);
              logger.info('Settings initialized from profile', { 
                module: 'settings',
                backgroundImage: !!userSettings.backgroundImage,
                backgroundOpacity: userSettings.backgroundOpacity
              });
            } catch (parseError) {
              logger.error('Failed to parse theme settings:', parseError, { module: 'settings' });
              await unifiedThemeController.initialize();
            }
          } else {
            await unifiedThemeController.initialize();
          }
        }

        // Sync local state
        const controllerState = unifiedThemeController.getState();
        setLocalState(controllerState);
        setIsInitialized(true);
        setIsLoading(false);
        
        logger.info('Settings state initialized successfully', { 
          module: 'settings',
          backgroundImage: !!controllerState.backgroundImage,
          backgroundOpacity: controllerState.backgroundOpacity
        });
      } catch (error) {
        logger.error('Error initializing settings:', error, { module: 'settings' });
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeSettings();
  }, [profile?.theme_settings, isInitialized]);

  // Subscribe to controller changes
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribeController = unifiedThemeController.subscribe((newState) => {
      setLocalState(newState);
      logger.info('Settings state updated from controller', { 
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
      unsubscribeController();
      unsubscribeBackground();
    };
  }, [isInitialized]);

  // Wrapper functions to track changes and update controller immediately
  const updateLightTheme = (newTheme: ThemeColors) => {
    setLocalState(prev => ({ ...prev, lightTheme: newTheme }));
    unifiedThemeController.setLightTheme(newTheme);
    setHasChanges(true);
    logger.info('Light theme updated', { module: 'settings' });
  };
  
  const updateDarkTheme = (newTheme: ThemeColors) => {
    setLocalState(prev => ({ ...prev, darkTheme: newTheme }));
    unifiedThemeController.setDarkTheme(newTheme);
    setHasChanges(true);
    logger.info('Dark theme updated', { module: 'settings' });
  };
  
  const updateBackgroundImage = (image: string | null, info?: ImageInfo) => {
    unifiedThemeController.setBackgroundImage(image);
    if (info) {
      setImageInfo(info);
    }
    setHasChanges(true);
    logger.info('Background image updated in settings', { module: 'settings', hasImage: !!image });
  };
  
  const updateBackgroundOpacity = (opacity: number) => {
    unifiedThemeController.setBackgroundOpacity(opacity);
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
