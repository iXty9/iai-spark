import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supaThemes } from '@/services/supa-themes/core';
import { ThemeColors } from '@/types/theme';
import { logger } from '@/utils/logging';

export interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

export const useSupaThemes = () => {
  const { user } = useAuth();
  const [state, setState] = useState(() => supaThemes.getState());
  const [imageInfo, setImageInfo] = useState<ImageInfo>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to theme service changes
  useEffect(() => {
    const unsubscribe = supaThemes.subscribe(setState);
    return unsubscribe;
  }, []);

  // Initialize when user changes
  useEffect(() => {
    if (user?.id) {
      supaThemes.initialize(user.id).catch(error => {
        logger.error('Failed to initialize SupaThemes', error, { module: 'use-supa-themes' });
      });
    }
  }, [user?.id]);

  // Theme operations
  const setMode = useCallback((mode: 'light' | 'dark') => {
    if (state.isInPreview) {
      supaThemes.previewMode(mode);
    } else {
      supaThemes.setMode(mode);
    }
  }, [state.isInPreview]);

  const setLightTheme = useCallback((theme: ThemeColors) => {
    if (state.isInPreview) {
      supaThemes.previewLightTheme(theme);
    } else {
      supaThemes.setLightTheme(theme);
    }
  }, [state.isInPreview]);

  const setDarkTheme = useCallback((theme: ThemeColors) => {
    if (state.isInPreview) {
      supaThemes.previewDarkTheme(theme);
    } else {
      supaThemes.setDarkTheme(theme);
    }
  }, [state.isInPreview]);

  const setBackgroundImage = useCallback((image: string | null, info?: ImageInfo) => {
    if (state.isInPreview) {
      supaThemes.previewBackgroundImage(image);
    } else {
      supaThemes.setBackgroundImage(image);
    }
    
    if (info) {
      setImageInfo(info);
    } else if (image === null) {
      setImageInfo({});
    }
  }, [state.isInPreview]);

  const setBackgroundOpacity = useCallback((opacity: number) => {
    if (state.isInPreview) {
      supaThemes.previewBackgroundOpacity(opacity);
    } else {
      supaThemes.setBackgroundOpacity(opacity);
    }
  }, [state.isInPreview]);

  const setAutoDimDarkMode = useCallback((enabled: boolean) => {
    if (state.isInPreview) {
      supaThemes.previewAutoDimDarkMode(enabled);
    } else {
      supaThemes.setAutoDimDarkMode(enabled);
    }
  }, [state.isInPreview]);

  // Settings mode operations
  const enterSettingsMode = useCallback(() => {
    supaThemes.enterPreviewMode();
  }, []);

  const exitSettingsMode = useCallback((save: boolean = false) => {
    supaThemes.exitPreviewMode(save);
    if (!save) {
      setImageInfo({});
    }
  }, []);

  // Save/reset operations
  const saveChanges = useCallback(async (): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      return await supaThemes.saveTheme();
    } catch (error) {
      logger.error('Failed to save theme:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    try {
      setIsSubmitting(true);
      const success = await supaThemes.resetToDefaults();
      if (success) {
        setImageInfo({});
      }
      return success;
    } catch (error) {
      logger.error('Failed to reset theme:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const discardChanges = useCallback(() => {
    exitSettingsMode(false);
  }, [exitSettingsMode]);

  // Computed values for current display
  const currentMode = state.previewMode || state.mode;
  const currentLightTheme = state.previewLightTheme || state.lightTheme;
  const currentDarkTheme = state.previewDarkTheme || state.darkTheme;
  const currentBackgroundImage = state.previewBackgroundImage !== undefined 
    ? state.previewBackgroundImage 
    : state.backgroundImage;
  const currentBackgroundOpacity = state.previewBackgroundOpacity ?? state.backgroundOpacity;
  const currentTheme = currentMode === 'dark' ? currentDarkTheme : currentLightTheme;

  return {
    // State
    isLoading: !state.isReady,
    isSubmitting,
    hasChanges: state.hasUnsavedChanges,
    isInPreview: state.isInPreview,
    imageInfo,

    // Current values (preview-aware)
    mode: currentMode,
    theme: currentMode, // Alias for compatibility
    lightTheme: currentLightTheme,
    darkTheme: currentDarkTheme,
    backgroundImage: currentBackgroundImage,
    backgroundOpacity: currentBackgroundOpacity,
    autoDimDarkMode: state.previewAutoDimDarkMode ?? state.autoDimDarkMode,
    currentTheme,
    currentThemeColors: currentTheme, // Alias for compatibility

    // Theme operations
    setMode,
    setTheme: setMode, // Alias for compatibility
    setLightTheme,
    setDarkTheme,
    setBackgroundImage,
    setBackgroundOpacity,
    setAutoDimDarkMode,
    applyThemeColors: (colors: ThemeColors) => {
      if (currentMode === 'light') {
        setLightTheme(colors);
      } else {
        setDarkTheme(colors);
      }
    },
    applyBackground: (image: string | null, opacity: number) => {
      setBackgroundImage(image);
      setBackgroundOpacity(opacity);
    },

    // Settings mode operations
    enterSettingsMode,
    exitSettingsMode,
    updatePreviewMode: supaThemes.previewMode.bind(supaThemes),
    updatePreviewLightTheme: supaThemes.previewLightTheme.bind(supaThemes),
    updatePreviewDarkTheme: supaThemes.previewDarkTheme.bind(supaThemes),
    updatePreviewBackgroundImage: setBackgroundImage,
    updatePreviewBackgroundOpacity: supaThemes.previewBackgroundOpacity.bind(supaThemes),

    // Persistence operations
    saveChanges,
    resetToDefaults,
    discardChanges,
    resetTheme: resetToDefaults, // Alias for compatibility

    // Compatibility properties
    isThemeLoaded: state.isReady,

    // Utilities
    setImageInfo
  };
};