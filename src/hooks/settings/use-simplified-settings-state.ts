
import { useState, useEffect } from 'react';
import { ThemeColors } from '@/types/theme';
import { logger } from '@/utils/logging';
import { productionThemeService, ThemeState } from '@/services/production-theme-service';

export interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

export const useSimplifiedSettingsState = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo>({});
  const [themeState, setThemeState] = useState<ThemeState>(() => productionThemeService.getState());

  // Subscribe to theme service changes with immediate initialization
  useEffect(() => {
    // If service is not ready, initialize it but don't block UI
    if (!themeState.isReady) {
      productionThemeService.initialize().catch(error => {
        logger.error('Failed to initialize theme service in settings', error, { module: 'settings' });
      });
    }

    const unsubscribe = productionThemeService.subscribe((newState) => {
      setThemeState(newState);
      logger.info('Settings state updated from theme service', { 
        module: 'settings',
        backgroundImage: !!newState.backgroundImage,
        backgroundOpacity: newState.backgroundOpacity,
        isReady: newState.isReady
      });
    });

    return unsubscribe;
  }, []);

  // Wrapper functions to track changes and update service immediately
  const updateLightTheme = (newTheme: ThemeColors) => {
    productionThemeService.setLightTheme(newTheme);
    setHasChanges(true);
    logger.info('Light theme updated', { module: 'settings' });
  };
  
  const updateDarkTheme = (newTheme: ThemeColors) => {
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
    lightTheme: themeState.lightTheme,
    darkTheme: themeState.darkTheme,
    backgroundImage: themeState.backgroundImage,
    backgroundOpacity: themeState.backgroundOpacity,
    isSubmitting,
    isLoading: false, // Never block UI with loading states
    hasChanges,
    imageInfo,
    setLightTheme: updateLightTheme,
    setDarkTheme: updateDarkTheme,
    setBackgroundImage: updateBackgroundImage,
    setBackgroundOpacity: updateBackgroundOpacity,
    setIsSubmitting,
    setHasChanges,
    setImageInfo: (info: ImageInfo) => setImageInfo(info),
    isInitialized: themeState.isReady,
    backgroundError: null,
    isBackgroundApplied: !!themeState.backgroundImage
  };
};
