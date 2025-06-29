
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { centralizedThemeService, CentralizedThemeState } from '@/services/centralized-theme-service';
import { ThemeColors } from '@/types/theme';
import { logger } from '@/utils/logging';

export interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

export const useCentralizedSettingsState = () => {
  const { profile } = useAuth();
  const [themeState, setThemeState] = useState<CentralizedThemeState>(() => centralizedThemeService.getState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo>({});

  // Initialize theme service when profile loads
  useEffect(() => {
    const initializeTheme = async () => {
      if (!themeState.isReady) {
        let userSettings = null;
        
        if (profile?.theme_settings) {
          try {
            userSettings = JSON.parse(profile.theme_settings);
          } catch (error) {
            logger.error('Failed to parse theme settings:', error, { module: 'centralized-settings' });
          }
        }
        
        await centralizedThemeService.initialize(userSettings);
      }
    };

    initializeTheme();
  }, [profile?.theme_settings, themeState.isReady]);

  // Subscribe to theme service changes
  useEffect(() => {
    const unsubscribe = centralizedThemeService.subscribe((newState) => {
      setThemeState(newState);
    });

    return unsubscribe;
  }, []);

  // Settings actions
  const enterSettingsMode = () => {
    centralizedThemeService.enterPreviewMode();
  };

  const exitSettingsMode = (save: boolean = false) => {
    centralizedThemeService.exitPreviewMode(save);
  };

  const updatePreviewMode = (mode: 'light' | 'dark') => {
    centralizedThemeService.previewThemeMode(mode);
  };

  const updatePreviewLightTheme = (theme: ThemeColors) => {
    centralizedThemeService.previewLightTheme(theme);
  };

  const updatePreviewDarkTheme = (theme: ThemeColors) => {
    centralizedThemeService.previewDarkTheme(theme);
  };

  const updatePreviewBackgroundImage = (image: string | null, info?: ImageInfo) => {
    centralizedThemeService.previewBackgroundImage(image);
    if (info) {
      setImageInfo(info);
    }
  };

  const updatePreviewBackgroundOpacity = (opacity: number) => {
    centralizedThemeService.previewBackgroundOpacity(opacity);
  };

  const saveChanges = async (): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      centralizedThemeService.exitPreviewMode(true);
      logger.info('Settings saved successfully', { module: 'centralized-settings' });
      return true;
    } catch (error) {
      logger.error('Failed to save settings:', error, { module: 'centralized-settings' });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const discardChanges = () => {
    centralizedThemeService.exitPreviewMode(false);
  };

  const resetToDefaults = async (): Promise<boolean> => {
    return await centralizedThemeService.loadDefaultTheme();
  };

  // Computed values for easier access
  const currentMode = themeState.previewMode || themeState.mode;
  const currentLightTheme = themeState.previewLightTheme || themeState.lightTheme;
  const currentDarkTheme = themeState.previewDarkTheme || themeState.darkTheme;
  const currentBackgroundImage = themeState.previewBackgroundImage !== undefined 
    ? themeState.previewBackgroundImage 
    : themeState.backgroundImage;
  const currentBackgroundOpacity = themeState.previewBackgroundOpacity ?? themeState.backgroundOpacity;

  return {
    // State
    isLoading: !themeState.isReady,
    isSubmitting,
    hasChanges: themeState.hasUnsavedChanges,
    isInPreview: themeState.isInPreview,
    imageInfo,
    
    // Current values (including preview)
    mode: currentMode,
    lightTheme: currentLightTheme,
    darkTheme: currentDarkTheme,
    backgroundImage: currentBackgroundImage,
    backgroundOpacity: currentBackgroundOpacity,
    
    // Actions
    enterSettingsMode,
    exitSettingsMode,
    updatePreviewMode,
    updatePreviewLightTheme,
    updatePreviewDarkTheme,
    updatePreviewBackgroundImage,
    updatePreviewBackgroundOpacity,
    saveChanges,
    discardChanges,
    resetToDefaults,
    setImageInfo
  };
};
