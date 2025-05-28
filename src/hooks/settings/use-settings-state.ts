
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors } from '@/types/theme';
import { logger } from '@/utils/logging';
import { unifiedThemeController } from '@/services/unified-theme-controller';

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
  
  // Track if we've loaded from profile to prevent overwrites
  const hasLoadedFromProfile = useRef(false);

  // Wait for controller initialization before proceeding
  useEffect(() => {
    const checkControllerReady = () => {
      if (unifiedThemeController.initialized) {
        // Controller is ready, sync our state
        setLocalState(unifiedThemeController.getState());
        setIsInitialized(true);
        setIsLoading(false);
        logger.info('Settings state synced with initialized controller', { module: 'settings' });
      } else {
        // Controller not ready yet, wait
        setTimeout(checkControllerReady, 100);
      }
    };

    checkControllerReady();
  }, []);

  // Subscribe to controller changes only after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = unifiedThemeController.subscribe((newState) => {
      // Only update if this isn't coming from our own changes
      if (!hasChanges) {
        setLocalState(newState);
        logger.info('Settings state updated from controller', { module: 'settings' });
      }
    });

    return unsubscribe;
  }, [isInitialized, hasChanges]);

  // Wrapper functions to track changes and update controller
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
    setLocalState(prev => ({ ...prev, backgroundImage: image }));
    unifiedThemeController.setBackgroundImage(image);
    if (info) {
      setImageInfo(info);
    }
    setHasChanges(true);
    logger.info('Background image updated', { module: 'settings', hasImage: !!image });
  };
  
  const updateBackgroundOpacity = (opacity: number) => {
    setLocalState(prev => ({ ...prev, backgroundOpacity: opacity }));
    unifiedThemeController.setBackgroundOpacity(opacity);
    setHasChanges(true);
    logger.info('Background opacity updated', { module: 'settings', opacity });
  };

  return {
    lightTheme: localState.lightTheme,
    darkTheme: localState.darkTheme,
    backgroundImage: localState.backgroundImage,
    backgroundOpacity: localState.backgroundOpacity,
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
    isInitialized
  };
};
