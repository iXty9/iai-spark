
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsPersistence } from './use-settings-persistence';
import { productionThemeService } from '@/services/production-theme-service';
import { ThemeColors, ThemeSettings } from '@/types/theme';
import { logger } from '@/utils/logging';

export interface ImageInfo {
  originalSize: string;
  optimizedSize: string;
}

export const useCentralizedSettingsState = () => {
  const { user, updateProfile } = useAuth();
  const { 
    mode: currentMode, 
    lightTheme: currentLightTheme, 
    darkTheme: currentDarkTheme,
    backgroundImage: currentBackgroundImage,
    backgroundOpacity: currentBackgroundOpacity
  } = useTheme();

  // Local state for preview changes
  const [isInPreview, setIsInPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);

  // Preview state - starts with current values
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>(currentMode);
  const [previewLightTheme, setPreviewLightTheme] = useState<ThemeColors>(currentLightTheme);
  const [previewDarkTheme, setPreviewDarkTheme] = useState<ThemeColors>(currentDarkTheme);
  const [previewBackgroundImage, setPreviewBackgroundImage] = useState<string | null>(currentBackgroundImage);
  const [previewBackgroundOpacity, setPreviewBackgroundOpacity] = useState<number>(currentBackgroundOpacity);

  // Update preview state when theme changes
  useEffect(() => {
    if (!isInPreview) {
      setPreviewMode(currentMode);
      setPreviewLightTheme(currentLightTheme);
      setPreviewDarkTheme(currentDarkTheme);
      setPreviewBackgroundImage(currentBackgroundImage);
      setPreviewBackgroundOpacity(currentBackgroundOpacity);
    }
  }, [currentMode, currentLightTheme, currentDarkTheme, currentBackgroundImage, currentBackgroundOpacity, isInPreview]);

  // Settings persistence hook
  const { isSubmitting, handleSaveSettings, handleResetSettings } = useSettingsPersistence({
    user,
    theme: previewMode,
    lightTheme: previewLightTheme,
    darkTheme: previewDarkTheme,
    backgroundImage: previewBackgroundImage,
    backgroundOpacity: previewBackgroundOpacity,
    setLightTheme: setPreviewLightTheme,
    setDarkTheme: setPreviewDarkTheme,
    setBackgroundImage: setPreviewBackgroundImage,
    setBackgroundOpacity: setPreviewBackgroundOpacity,
    setHasChanges,
    updateProfile
  });

  const enterSettingsMode = useCallback(() => {
    setIsInPreview(true);
    logger.info('Entered settings preview mode', { module: 'settings' });
  }, []);

  const exitSettingsMode = useCallback((shouldSave: boolean = false) => {
    if (shouldSave) {
      // Save changes to production service before exiting
      const themeSettings: ThemeSettings = {
        mode: previewMode,
        lightTheme: previewLightTheme,
        darkTheme: previewDarkTheme,
        backgroundImage: previewBackgroundImage,
        backgroundOpacity: previewBackgroundOpacity
      };
      
      productionThemeService.initialize(themeSettings, true);
      logger.info('Synced settings to production service on exit', { module: 'settings' });
    } else {
      // Restore original theme if not saving
      productionThemeService.initialize({
        mode: currentMode,
        lightTheme: currentLightTheme,
        darkTheme: currentDarkTheme,
        backgroundImage: currentBackgroundImage,
        backgroundOpacity: currentBackgroundOpacity
      }, true);
      logger.info('Restored original theme on exit without saving', { module: 'settings' });
    }
    
    setIsInPreview(false);
    setHasChanges(false);
    logger.info('Exited settings preview mode', { shouldSave, module: 'settings' });
  }, [previewMode, previewLightTheme, previewDarkTheme, previewBackgroundImage, previewBackgroundOpacity, currentMode, currentLightTheme, currentDarkTheme, currentBackgroundImage, currentBackgroundOpacity]);

  // Preview update functions with production service sync
  const updatePreviewMode = useCallback((mode: 'light' | 'dark') => {
    setPreviewMode(mode);
    setHasChanges(true);
    
    // Sync to production service for immediate preview
    productionThemeService.setMode(mode);
    logger.info('Updated preview mode and synced to production', { mode, module: 'settings' });
  }, []);

  const updatePreviewLightTheme = useCallback((theme: ThemeColors) => {
    setPreviewLightTheme(theme);
    setHasChanges(true);
    
    // Sync to production service for immediate preview
    productionThemeService.setLightTheme(theme);
    logger.info('Updated preview light theme and synced to production', { module: 'settings' });
  }, []);

  const updatePreviewDarkTheme = useCallback((theme: ThemeColors) => {
    setPreviewDarkTheme(theme);
    setHasChanges(true);
    
    // Sync to production service for immediate preview
    productionThemeService.setDarkTheme(theme);
    logger.info('Updated preview dark theme and synced to production', { module: 'settings' });
  }, []);

  const updatePreviewBackgroundImage = useCallback((image: string | null, info?: ImageInfo) => {
    setPreviewBackgroundImage(image);
    setHasChanges(true);
    if (info) setImageInfo(info);
    
    // Sync to production service for immediate preview
    productionThemeService.setBackgroundImage(image);
    logger.info('Updated preview background image and synced to production', { hasImage: !!image, module: 'settings' });
  }, []);

  const updatePreviewBackgroundOpacity = useCallback((opacity: number) => {
    setPreviewBackgroundOpacity(opacity);
    setHasChanges(true);
    
    // Sync to production service for immediate preview
    productionThemeService.setBackgroundOpacity(opacity);
    logger.info('Updated preview background opacity and synced to production', { opacity, module: 'settings' });
  }, []);

  const saveChanges = useCallback(async (): Promise<boolean> => {
    try {
      await handleSaveSettings();
      
      // PHASE 1: Push final changes to production service after successful save
      const finalThemeSettings: ThemeSettings = {
        mode: previewMode,
        lightTheme: previewLightTheme,
        darkTheme: previewDarkTheme,
        backgroundImage: previewBackgroundImage,
        backgroundOpacity: previewBackgroundOpacity
      };
      
      await productionThemeService.initialize(finalThemeSettings, true);
      logger.info('Settings saved and synced to production service', { module: 'settings' });
      
      setHasChanges(false);
      return true;
    } catch (error) {
      logger.error('Failed to save settings', error, { module: 'settings' });
      return false;
    }
  }, [handleSaveSettings, previewMode, previewLightTheme, previewDarkTheme, previewBackgroundImage, previewBackgroundOpacity]);

  const discardChanges = useCallback(() => {
    // Restore original values
    setPreviewMode(currentMode);
    setPreviewLightTheme(currentLightTheme);
    setPreviewDarkTheme(currentDarkTheme);
    setPreviewBackgroundImage(currentBackgroundImage);
    setPreviewBackgroundOpacity(currentBackgroundOpacity);
    
    // Restore production service to original state
    productionThemeService.initialize({
      mode: currentMode,
      lightTheme: currentLightTheme,
      darkTheme: currentDarkTheme,
      backgroundImage: currentBackgroundImage,
      backgroundOpacity: currentBackgroundOpacity
    }, true);
    
    setHasChanges(false);
    setImageInfo(null);
    logger.info('Discarded settings changes and restored production service', { module: 'settings' });
  }, [currentMode, currentLightTheme, currentDarkTheme, currentBackgroundImage, currentBackgroundOpacity]);

  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    try {
      await handleResetSettings();
      setHasChanges(false);
      return true;
    } catch (error) {
      logger.error('Failed to reset settings', error, { module: 'settings' });
      return false;
    }
  }, [handleResetSettings]);

  return {
    // State
    isLoading,
    isSubmitting,
    hasChanges,
    isInPreview,
    imageInfo,

    // Current values (what's actually applied)
    mode: previewMode,
    lightTheme: previewLightTheme,
    darkTheme: previewDarkTheme,
    backgroundImage: previewBackgroundImage,
    backgroundOpacity: previewBackgroundOpacity,

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
    resetToDefaults
  };
};
