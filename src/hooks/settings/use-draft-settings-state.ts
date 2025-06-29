import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { ThemeColors, ThemeSettings } from '@/types/theme';
import { logger } from '@/utils/logging';
import { productionThemeService } from '@/services/production-theme-service';

export interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

interface DraftState {
  mode: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
}

export const useDraftSettingsState = () => {
  const { profile } = useAuth();
  const { theme: currentTheme, lightTheme, darkTheme, backgroundImage, backgroundOpacity } = useTheme();
  
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [originalState, setOriginalState] = useState<DraftState | null>(null); // Track original state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize draft state from current theme
  useEffect(() => {
    const initializeDraftState = async () => {
      try {
        setIsLoading(true);
        
        // Wait for theme service to be ready
        if (!productionThemeService.getState().isReady) {
          await productionThemeService.initialize();
        }

        // Initialize draft state with current theme values
        const initialDraftState: DraftState = {
          mode: currentTheme,
          lightTheme,
          darkTheme,
          backgroundImage,
          backgroundOpacity
        };

        setDraftState(initialDraftState);
        setOriginalState({ ...initialDraftState }); // Store original state for comparison
        setIsInitialized(true);
        setHasChanges(false);
        
        logger.info('Draft settings state initialized', { 
          module: 'draft-settings',
          mode: currentTheme,
          hasBackground: !!backgroundImage
        });
      } catch (error) {
        logger.error('Failed to initialize draft settings state:', error, { module: 'draft-settings' });
      } finally {
        setIsLoading(false);
      }
    };

    if (!isInitialized) {
      initializeDraftState();
    }
  }, [currentTheme, lightTheme, darkTheme, backgroundImage, backgroundOpacity, isInitialized]);

  // Helper function to check if draft state differs from original
  const checkForChanges = useCallback((newDraftState: DraftState, original: DraftState | null) => {
    if (!original) return false;
    
    return (
      newDraftState.mode !== original.mode ||
      JSON.stringify(newDraftState.lightTheme) !== JSON.stringify(original.lightTheme) ||
      JSON.stringify(newDraftState.darkTheme) !== JSON.stringify(original.darkTheme) ||
      newDraftState.backgroundImage !== original.backgroundImage ||
      newDraftState.backgroundOpacity !== original.backgroundOpacity
    );
  }, []);

  // Draft state update functions
  const updateDraftLightTheme = useCallback((newTheme: ThemeColors) => {
    setDraftState(prev => {
      if (!prev) return null;
      
      const updatedDraft = { ...prev, lightTheme: newTheme };
      const hasActualChanges = checkForChanges(updatedDraft, originalState);
      setHasChanges(hasActualChanges);
      
      return updatedDraft;
    });
    
    // Apply preview if currently in light mode
    if (draftState?.mode === 'light') {
      productionThemeService.previewTheme(newTheme, 'light');
    }
    
    logger.info('Draft light theme updated', { module: 'draft-settings' });
  }, [draftState?.mode, checkForChanges, originalState]);

  const updateDraftDarkTheme = useCallback((newTheme: ThemeColors) => {
    setDraftState(prev => {
      if (!prev) return null;
      
      const updatedDraft = { ...prev, darkTheme: newTheme };
      const hasActualChanges = checkForChanges(updatedDraft, originalState);
      setHasChanges(hasActualChanges);
      
      return updatedDraft;
    });
    
    // Apply preview if currently in dark mode
    if (draftState?.mode === 'dark') {
      productionThemeService.previewTheme(newTheme, 'dark');
    }
    
    logger.info('Draft dark theme updated', { module: 'draft-settings' });
  }, [draftState?.mode, checkForChanges, originalState]);

  const updateDraftBackgroundImage = useCallback((image: string | null, info?: ImageInfo) => {
    setDraftState(prev => {
      if (!prev) return null;
      
      const updatedDraft = { ...prev, backgroundImage: image };
      const hasActualChanges = checkForChanges(updatedDraft, originalState);
      setHasChanges(hasActualChanges);
      
      return updatedDraft;
    });
    
    if (info) {
      setImageInfo(info);
    }
    
    // Apply preview immediately
    productionThemeService.previewBackground(image, draftState?.backgroundOpacity || 0.5);
    
    logger.info('Draft background image updated', { module: 'draft-settings', hasImage: !!image });
  }, [draftState?.backgroundOpacity, checkForChanges, originalState]);

  const updateDraftBackgroundOpacity = useCallback((opacity: number) => {
    setDraftState(prev => {
      if (!prev) return null;
      
      const updatedDraft = { ...prev, backgroundOpacity: opacity };
      const hasActualChanges = checkForChanges(updatedDraft, originalState);
      setHasChanges(hasActualChanges);
      
      return updatedDraft;
    });
    
    // Apply preview immediately
    productionThemeService.previewBackground(draftState?.backgroundImage || null, opacity);
    
    logger.info('Draft background opacity updated', { module: 'draft-settings', opacity });
  }, [draftState?.backgroundImage, checkForChanges, originalState]);

  // FIXED: Updated draft mode update function to NOT mark changes for preview mode switching
  const updateDraftMode = useCallback((mode: 'light' | 'dark') => {
    setDraftState(prev => {
      if (!prev) return null;
      
      // Update the mode for preview purposes but don't mark as changed
      // The mode change only counts as a "change" if it differs from the original saved mode
      return { ...prev, mode };
    });
    
    // Apply preview immediately with the correct theme colors
    const themeColors = mode === 'light' ? draftState?.lightTheme : draftState?.darkTheme;
    if (themeColors) {
      productionThemeService.previewTheme(themeColors, mode);
    }
    
    logger.info('Draft theme mode updated for preview only (no change tracking)', { module: 'draft-settings', mode });
  }, [draftState?.lightTheme, draftState?.darkTheme]);

  const saveChanges = useCallback(async () => {
    if (!draftState) return;
    
    try {
      setIsSubmitting(true);
      
      // Apply all changes to the production service
      productionThemeService.setMode(draftState.mode);
      productionThemeService.setLightTheme(draftState.lightTheme);
      productionThemeService.setDarkTheme(draftState.darkTheme);
      productionThemeService.setBackgroundImage(draftState.backgroundImage);
      productionThemeService.setBackgroundOpacity(draftState.backgroundOpacity);
      
      // Update original state to current draft state
      setOriginalState({ ...draftState });
      setHasChanges(false);
      
      logger.info('Draft changes saved successfully', { module: 'draft-settings' });
    } catch (error) {
      logger.error('Failed to save draft changes:', error, { module: 'draft-settings' });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [draftState]);

  const discardChanges = useCallback(async () => {
    if (!originalState) return;
    
    // Reset draft state to original state
    setDraftState({ ...originalState });
    setHasChanges(false);
    
    // Restore original theme
    productionThemeService.setMode(originalState.mode);
    const currentColors = originalState.mode === 'light' ? originalState.lightTheme : originalState.darkTheme;
    productionThemeService.previewTheme(currentColors, originalState.mode);
    productionThemeService.previewBackground(originalState.backgroundImage, originalState.backgroundOpacity);
    
    logger.info('Draft changes discarded', { module: 'draft-settings' });
  }, [originalState]);

  const resetToDefaults = useCallback(async () => {
    // Load default theme from service
    await productionThemeService.loadDefaultTheme();
    
    const serviceState = productionThemeService.getState();
    const defaultState: DraftState = {
      mode: serviceState.mode,
      lightTheme: serviceState.lightTheme,
      darkTheme: serviceState.darkTheme,
      backgroundImage: serviceState.backgroundImage,
      backgroundOpacity: serviceState.backgroundOpacity
    };
    
    setDraftState(defaultState);
    const hasActualChanges = checkForChanges(defaultState, originalState);
    setHasChanges(hasActualChanges);
    
    logger.info('Draft state reset to defaults', { module: 'draft-settings' });
  }, [checkForChanges, originalState]);

  const refreshSettings = useCallback(async () => {
    setIsInitialized(false);
    setIsLoading(true);
  }, []);

  return {
    draftState,
    isInitialized,
    isSubmitting,
    isLoading,
    hasChanges,
    imageInfo,
    updateDraftLightTheme,
    updateDraftDarkTheme,
    updateDraftBackgroundImage,
    updateDraftBackgroundOpacity,
    updateDraftMode,
    saveChanges,
    discardChanges,
    resetToDefaults,
    refreshSettings
  };
};
