
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { productionThemeService, ThemeState } from '@/services/production-theme-service';
import { logger } from '@/utils/logging';

export interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

export const useUnifiedTheme = () => {
  const { user, updateProfile } = useAuth();
  const [themeState, setThemeState] = useState<ThemeState>(() => productionThemeService.getState());
  const [imageInfo, setImageInfo] = useState<ImageInfo>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to theme service changes
  useEffect(() => {
    const unsubscribe = productionThemeService.subscribe((newState) => {
      setThemeState(newState);
    });

    // Initialize if needed
    if (!themeState.isReady) {
      productionThemeService.initialize().catch(error => {
        logger.error('Failed to initialize unified theme service', error, { module: 'unified-theme-hook' });
      });
    }

    return unsubscribe;
  }, []);

  // Settings persistence
  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      setIsSubmitting(true);
      const success = await productionThemeService.saveUserTheme(user, updateProfile);
      return success;
    } catch (error) {
      logger.error('Failed to save theme settings:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, updateProfile]);

  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      const success = await productionThemeService.resetToDefaults(user, updateProfile);
      setImageInfo({});
      return success;
    } catch (error) {
      logger.error('Failed to reset theme settings:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, updateProfile]);

  return {
    // State
    isLoading: !themeState.isReady,
    isSubmitting,
    hasChanges: themeState.hasUnsavedChanges,
    isInPreview: themeState.isInPreview,
    imageInfo,

    // Current values (preview or actual)
    mode: themeState.previewMode || themeState.mode,
    lightTheme: themeState.previewLightTheme || themeState.lightTheme,
    darkTheme: themeState.previewDarkTheme || themeState.darkTheme,
    backgroundImage: themeState.previewBackgroundImage !== undefined 
      ? themeState.previewBackgroundImage 
      : themeState.backgroundImage,
    backgroundOpacity: themeState.previewBackgroundOpacity ?? themeState.backgroundOpacity,

    // Settings actions
    enterSettingsMode: productionThemeService.enterPreviewMode.bind(productionThemeService),
    exitSettingsMode: productionThemeService.exitPreviewMode.bind(productionThemeService),
    updatePreviewMode: productionThemeService.previewThemeMode.bind(productionThemeService),
    updatePreviewLightTheme: productionThemeService.previewLightTheme.bind(productionThemeService),
    updatePreviewDarkTheme: productionThemeService.previewDarkTheme.bind(productionThemeService),
    updatePreviewBackgroundImage: (image: string | null, info?: ImageInfo) => {
      productionThemeService.previewBackgroundImage(image);
      if (info) {
        setImageInfo(info);
      } else if (image === null) {
        // Clear image info when removing background
        setImageInfo({});
      }
    },
    updatePreviewBackgroundOpacity: productionThemeService.previewBackgroundOpacity.bind(productionThemeService),
    saveChanges,
    discardChanges: () => {
      productionThemeService.exitPreviewMode(false);
      setImageInfo({});
    },
    resetToDefaults,
    setImageInfo
  };
};
