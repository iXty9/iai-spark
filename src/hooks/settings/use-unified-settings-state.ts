
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { unifiedThemeService, UnifiedThemeState } from '@/services/unified-theme-service';
import { ThemeColors } from '@/types/theme';
import { logger } from '@/utils/logging';

export interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

export const useUnifiedSettingsState = () => {
  const { profile } = useAuth();
  const [themeState, setThemeState] = useState<UnifiedThemeState>(() => unifiedThemeService.getState());
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
            logger.error('Failed to parse theme settings:', error);
          }
        }
        
        await unifiedThemeService.initialize(userSettings);
      }
    };

    initializeTheme();
  }, [profile?.theme_settings, themeState.isReady]);

  // Subscribe to theme service changes
  useEffect(() => {
    const unsubscribe = unifiedThemeService.subscribe((newState) => {
      setThemeState(newState);
    });

    return unsubscribe;
  }, []);

  // Settings actions
  const enterSettingsMode = () => {
    unifiedThemeService.enterPreviewMode();
  };

  const exitSettingsMode = (save: boolean = false) => {
    unifiedThemeService.exitPreviewMode(save);
  };

  const updatePreviewMode = (mode: 'light' | 'dark') => {
    unifiedThemeService.previewThemeMode(mode);
  };

  const updatePreviewLightTheme = (theme: ThemeColors) => {
    unifiedThemeService.previewLightTheme(theme);
  };

  const updatePreviewDarkTheme = (theme: ThemeColors) => {
    unifiedThemeService.previewDarkTheme(theme);
  };

  const updatePreviewBackgroundImage = (image: string | null, info?: ImageInfo) => {
    unifiedThemeService.previewBackgroundImage(image);
    if (info) {
      setImageInfo(info);
    }
  };

  const updatePreviewBackgroundOpacity = (opacity: number) => {
    unifiedThemeService.previewBackgroundOpacity(opacity);
  };

  const saveChanges = async (): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      unifiedThemeService.exitPreviewMode(true);
      logger.info('Settings saved successfully');
      return true;
    } catch (error) {
      logger.error('Failed to save settings:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const discardChanges = () => {
    unifiedThemeService.exitPreviewMode(false);
  };

  const resetToDefaults = async (): Promise<boolean> => {
    return await unifiedThemeService.loadDefaultTheme();
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
