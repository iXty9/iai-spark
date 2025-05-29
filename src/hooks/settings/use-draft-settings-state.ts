
import { useState, useEffect, useCallback } from 'react';
import { ThemeColors } from '@/types/theme';
import { productionThemeService } from '@/services/production-theme-service';
import { logger } from '@/utils/logging';
import { isEqual } from 'lodash';
import { useAuth } from '@/contexts/AuthContext';

export interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

export interface DraftSettingsState {
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  mode: 'light' | 'dark';
}

export const useDraftSettingsState = () => {
  // Draft state (what user is editing)
  const [draftState, setDraftState] = useState<DraftSettingsState | null>(null);
  
  // Saved state (what's actually applied)
  const [savedState, setSavedState] = useState<DraftSettingsState | null>(null);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { user, profile } = useAuth();

  // Load fresh user settings when component mounts or user changes
  const loadFreshUserSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      logger.info('Loading fresh user settings for settings page', { module: 'draft-settings' });

      // Load user theme settings from profile if available
      let userThemeSettings = null;
      if (user && profile?.theme_settings) {
        try {
          userThemeSettings = JSON.parse(profile.theme_settings);
          logger.info('Loaded theme settings from user profile', { 
            module: 'draft-settings',
            hasBackground: !!userThemeSettings.backgroundImage
          });
        } catch (error) {
          logger.error('Error parsing theme settings from profile:', error);
        }
      }

      // Initialize production theme service with fresh data, forcing reinit to get latest data
      await productionThemeService.initialize(userThemeSettings, true);

      // Wait for theme service to be ready
      let attempts = 0;
      while (!productionThemeService.getState().isReady && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      const currentState = productionThemeService.getState();
      const initialState: DraftSettingsState = {
        lightTheme: currentState.lightTheme,
        darkTheme: currentState.darkTheme,
        backgroundImage: currentState.backgroundImage,
        backgroundOpacity: currentState.backgroundOpacity,
        mode: currentState.mode
      };

      setDraftState(initialState);
      setSavedState(initialState);
      setIsInitialized(true);

      logger.info('Fresh settings loaded successfully', { 
        module: 'draft-settings',
        hasBackground: !!initialState.backgroundImage
      });
    } catch (error) {
      logger.error('Failed to load fresh user settings:', error);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

  // Load fresh data on mount
  useEffect(() => {
    loadFreshUserSettings();
  }, [loadFreshUserSettings]);

  // Subscribe to theme service changes (for external updates)
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = productionThemeService.subscribe((newState) => {
      const updatedSavedState: DraftSettingsState = {
        lightTheme: newState.lightTheme,
        darkTheme: newState.darkTheme,
        backgroundImage: newState.backgroundImage,
        backgroundOpacity: newState.backgroundOpacity,
        mode: newState.mode
      };

      setSavedState(updatedSavedState);
      
      // If we don't have pending changes, also update draft state
      if (draftState && isEqual(draftState, savedState)) {
        setDraftState(updatedSavedState);
      }

      logger.info('Settings state updated from theme service', { 
        module: 'draft-settings',
        hasChanges: !isEqual(draftState, updatedSavedState)
      });
    });

    return unsubscribe;
  }, [isInitialized, draftState, savedState]);

  // Calculate if there are unsaved changes
  const hasChanges = useCallback(() => {
    if (!draftState || !savedState) return false;
    return !isEqual(draftState, savedState);
  }, [draftState, savedState]);

  // Update draft state functions
  const updateDraftLightTheme = useCallback((newTheme: ThemeColors) => {
    if (!draftState) return;
    const updatedState = { ...draftState, lightTheme: newTheme };
    setDraftState(updatedState);
    
    // Apply preview if in light mode
    if (draftState.mode === 'light') {
      productionThemeService.previewTheme(newTheme, 'light');
    }
    
    logger.info('Draft light theme updated', { module: 'draft-settings' });
  }, [draftState]);

  const updateDraftDarkTheme = useCallback((newTheme: ThemeColors) => {
    if (!draftState) return;
    const updatedState = { ...draftState, darkTheme: newTheme };
    setDraftState(updatedState);
    
    // Apply preview if in dark mode
    if (draftState.mode === 'dark') {
      productionThemeService.previewTheme(newTheme, 'dark');
    }
    
    logger.info('Draft dark theme updated', { module: 'draft-settings' });
  }, [draftState]);

  const updateDraftBackgroundImage = useCallback((image: string | null, info?: ImageInfo) => {
    if (!draftState) return;
    const updatedState = { ...draftState, backgroundImage: image };
    setDraftState(updatedState);
    
    if (info) {
      setImageInfo(info);
    }
    
    // Apply preview immediately
    productionThemeService.previewBackground(image, draftState.backgroundOpacity);
    
    logger.info('Draft background image updated', { 
      module: 'draft-settings', 
      hasImage: !!image 
    });
  }, [draftState]);

  const updateDraftBackgroundOpacity = useCallback((opacity: number) => {
    if (!draftState) return;
    const updatedState = { ...draftState, backgroundOpacity: opacity };
    setDraftState(updatedState);
    
    // Apply preview immediately
    productionThemeService.previewBackground(draftState.backgroundImage, opacity);
    
    logger.info('Draft background opacity updated', { 
      module: 'draft-settings', 
      opacity 
    });
  }, [draftState]);

  const updateDraftMode = useCallback((mode: 'light' | 'dark') => {
    if (!draftState) return;
    const updatedState = { ...draftState, mode };
    setDraftState(updatedState);
    
    // Apply preview immediately
    const themeColors = mode === 'light' ? draftState.lightTheme : draftState.darkTheme;
    productionThemeService.previewTheme(themeColors, mode);
    
    logger.info('Draft mode updated', { module: 'draft-settings', mode });
  }, [draftState]);

  // Save changes
  const saveChanges = useCallback(async () => {
    if (!draftState || !hasChanges()) return false;

    setIsSubmitting(true);
    
    try {
      // Apply all changes to the theme service
      productionThemeService.setLightTheme(draftState.lightTheme);
      productionThemeService.setDarkTheme(draftState.darkTheme);
      productionThemeService.setBackgroundImage(draftState.backgroundImage);
      productionThemeService.setBackgroundOpacity(draftState.backgroundOpacity);
      productionThemeService.setMode(draftState.mode);

      // Update saved state
      setSavedState({ ...draftState });
      
      logger.info('Draft changes saved successfully', { module: 'draft-settings' });
      return true;
    } catch (error) {
      logger.error('Failed to save draft changes:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [draftState, hasChanges]);

  // Discard changes
  const discardChanges = useCallback(() => {
    if (!savedState) return;
    
    setDraftState({ ...savedState });
    
    // Restore theme service to saved state
    productionThemeService.setLightTheme(savedState.lightTheme);
    productionThemeService.setDarkTheme(savedState.darkTheme);
    productionThemeService.setBackgroundImage(savedState.backgroundImage);
    productionThemeService.setBackgroundOpacity(savedState.backgroundOpacity);
    productionThemeService.setMode(savedState.mode);
    
    logger.info('Draft changes discarded', { module: 'draft-settings' });
  }, [savedState]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      await productionThemeService.loadDefaultTheme();
      
      const newState = productionThemeService.getState();
      const defaultState: DraftSettingsState = {
        lightTheme: newState.lightTheme,
        darkTheme: newState.darkTheme,
        backgroundImage: newState.backgroundImage,
        backgroundOpacity: newState.backgroundOpacity,
        mode: newState.mode
      };

      setDraftState(defaultState);
      setSavedState(defaultState);
      
      logger.info('Settings reset to defaults', { module: 'draft-settings' });
      return true;
    } catch (error) {
      logger.error('Failed to reset to defaults:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Refresh data function for manual refresh
  const refreshSettings = useCallback(async () => {
    await loadFreshUserSettings();
  }, [loadFreshUserSettings]);

  return {
    // State
    draftState,
    savedState,
    isInitialized,
    isSubmitting,
    isLoading,
    hasChanges: hasChanges(),
    imageInfo,
    
    // Draft update functions
    updateDraftLightTheme,
    updateDraftDarkTheme,
    updateDraftBackgroundImage,
    updateDraftBackgroundOpacity,
    updateDraftMode,
    
    // Actions
    saveChanges,
    discardChanges,
    resetToDefaults,
    refreshSettings,
    
    // Setters for UI state
    setIsSubmitting,
    setImageInfo
  };
};
