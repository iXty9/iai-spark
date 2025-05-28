
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
  
  // Track initialization more reliably
  const initializationAttempted = useRef(false);
  const profileDataLoaded = useRef(false);

  // Wait for controller initialization AND load user settings
  useEffect(() => {
    const initializeSettings = async () => {
      // Prevent multiple initialization attempts
      if (initializationAttempted.current) return;
      initializationAttempted.current = true;

      try {
        // Wait for controller to be ready first
        let attempts = 0;
        const maxAttempts = 50;
        while (!unifiedThemeController.initialized && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!unifiedThemeController.initialized) {
          logger.warn('Controller initialization timeout', { module: 'settings' });
        }

        // Load profile data if available and not already loaded
        if (profile?.theme_settings && !profileDataLoaded.current) {
          try {
            const userSettings = JSON.parse(profile.theme_settings);
            
            // Initialize controller with user settings
            await unifiedThemeController.initialize(userSettings);
            profileDataLoaded.current = true;
            
            logger.info('Settings loaded from user profile', { 
              module: 'settings',
              backgroundImage: !!userSettings.backgroundImage,
              backgroundOpacity: userSettings.backgroundOpacity
            });
          } catch (parseError) {
            logger.error('Failed to parse theme settings from profile:', parseError, { module: 'settings' });
          }
        } else {
          // Initialize with defaults if no profile data
          await unifiedThemeController.initialize();
        }

        // Sync our local state with controller
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
  }, [profile?.theme_settings]);

  // Subscribe to controller changes only after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = unifiedThemeController.subscribe((newState) => {
      setLocalState(newState);
      logger.info('Settings state updated from controller', { 
        module: 'settings',
        backgroundImage: !!newState.backgroundImage,
        backgroundOpacity: newState.backgroundOpacity
      });
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
