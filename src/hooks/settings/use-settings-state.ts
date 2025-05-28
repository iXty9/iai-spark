
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

  // Wait for controller initialization AND load user settings
  useEffect(() => {
    const initializeSettings = async () => {
      // Wait for controller to be ready
      if (!unifiedThemeController.initialized) {
        setTimeout(initializeSettings, 100);
        return;
      }

      try {
        // If we have user profile data and haven't loaded it yet, load it
        if (profile?.theme_settings && !hasLoadedFromProfile.current) {
          const userSettings = JSON.parse(profile.theme_settings);
          
          // Update controller with user settings
          await unifiedThemeController.initialize(userSettings);
          hasLoadedFromProfile.current = true;
          
          logger.info('Settings loaded from user profile', { 
            module: 'settings',
            backgroundImage: !!userSettings.backgroundImage,
            backgroundOpacity: userSettings.backgroundOpacity
          });
        }

        // Sync our local state with controller
        const controllerState = unifiedThemeController.getState();
        setLocalState(controllerState);
        setIsInitialized(true);
        setIsLoading(false);
        
        logger.info('Settings state initialized', { 
          module: 'settings',
          backgroundImage: !!controllerState.backgroundImage,
          backgroundOpacity: controllerState.backgroundOpacity
        });
      } catch (error) {
        logger.error('Error initializing settings:', error);
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeSettings();
  }, [profile?.theme_settings]);

  // Subscribe to controller changes only after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = unifiedThemeController.subscribe((newState) => {
      // Only update if this isn't from our own changes (prevent loops)
      setLocalState(newState);
      logger.info('Settings state updated from controller', { module: 'settings' });
    });

    return unsubscribe;
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
    setLocalState(prev => ({ ...prev, backgroundImage: image }));
    unifiedThemeController.setBackgroundImage(image);
    if (info) {
      setImageInfo(info);
    }
    setHasChanges(true);
    logger.info('Background image updated in settings', { module: 'settings', hasImage: !!image });
  };
  
  const updateBackgroundOpacity = (opacity: number) => {
    setLocalState(prev => ({ ...prev, backgroundOpacity: opacity }));
    unifiedThemeController.setBackgroundOpacity(opacity);
    setHasChanges(true);
    logger.info('Background opacity updated in settings', { module: 'settings', opacity });
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
