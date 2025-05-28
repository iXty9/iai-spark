
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

  // Initialize the unified controller with user settings
  useEffect(() => {
    const initializeController = async () => {
      if (isInitialized) return;

      try {
        setIsLoading(true);
        logger.info('Initializing settings state', { module: 'settings' });

        let userSettings = null;
        if (profile?.theme_settings) {
          try {
            userSettings = JSON.parse(profile.theme_settings);
            logger.info('Found user theme settings', { module: 'settings' });
            hasLoadedFromProfile.current = true;
          } catch (e) {
            logger.warn('Failed to parse user theme settings', e);
          }
        }

        // Initialize the controller with user settings
        await unifiedThemeController.initialize(userSettings);
        
        // Set local state to match controller
        setLocalState(unifiedThemeController.getState());
        setIsInitialized(true);
        setIsLoading(false);

        logger.info('Settings state initialized successfully', { module: 'settings' });
      } catch (error) {
        logger.error('Failed to initialize settings state:', error);
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeController();
  }, [profile, isInitialized]);

  // Subscribe to controller changes
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
