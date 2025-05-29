
import { useCallback } from 'react';
import { ThemeColors } from '@/types/theme';
import { useThemeColorActions } from './use-theme-color-actions';
import { useBackgroundActions } from './use-background-actions';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';

interface UseDraftSettingsActionsProps {
  user: any;
  theme: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  updateDraftLightTheme: (theme: ThemeColors) => void;
  updateDraftDarkTheme: (theme: ThemeColors) => void;
  updateDraftBackgroundImage: (image: string | null, info?: any) => void;
  updateDraftBackgroundOpacity: (opacity: number) => void;
  updateDraftMode: (mode: 'light' | 'dark') => void;
  saveChanges: () => Promise<boolean>;
  discardChanges: () => void;
  resetToDefaults: () => Promise<boolean>;
  updateProfile?: (data: any) => Promise<any>;
}

export const useDraftSettingsActions = ({
  user,
  theme,
  lightTheme,
  darkTheme,
  backgroundImage,
  backgroundOpacity,
  updateDraftLightTheme,
  updateDraftDarkTheme,
  updateDraftBackgroundImage,
  updateDraftBackgroundOpacity,
  updateDraftMode,
  saveChanges,
  discardChanges,
  resetToDefaults,
  updateProfile
}: UseDraftSettingsActionsProps) => {
  
  const { toast } = useToast();
  
  // Theme color actions with draft state
  const { 
    handleLightThemeChange, 
    handleDarkThemeChange 
  } = useThemeColorActions({
    theme,
    lightTheme,
    darkTheme,
    setLightTheme: updateDraftLightTheme,
    setDarkTheme: updateDraftDarkTheme
  });

  // Background actions with draft state
  const { 
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    isLoading: isBackgroundLoading
  } = useBackgroundActions({
    backgroundImage,
    backgroundOpacity,
    setBackgroundImage: updateDraftBackgroundImage,
    setBackgroundOpacity: updateDraftBackgroundOpacity
  });
  
  // Handle theme mode change
  const handleThemeChange = useCallback((newTheme: 'light' | 'dark') => {
    updateDraftMode(newTheme);
  }, [updateDraftMode]);

  // Save settings with profile persistence
  const handleSaveSettings = useCallback(async () => {
    try {
      const success = await saveChanges();
      
      if (success && user && updateProfile) {
        // Create theme settings from current draft state
        const themeSettings = {
          mode: theme,
          lightTheme,
          darkTheme,
          backgroundImage,
          backgroundOpacity,
          exportDate: new Date().toISOString(),
          name: 'Custom Theme'
        };
        
        await updateProfile({ theme_settings: JSON.stringify(themeSettings) });
        
        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved successfully",
        });
        
        logger.info('Settings saved to profile', { module: 'draft-settings-actions' });
      } else if (success) {
        // Fallback to localStorage if no profile update function
        const themeSettings = {
          mode: theme,
          lightTheme,
          darkTheme,
          backgroundImage,
          backgroundOpacity,
          exportDate: new Date().toISOString(),
          name: 'Custom Theme'
        };
        
        localStorage.setItem('theme_settings', JSON.stringify(themeSettings));
        
        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved to local storage",
        });
      } else {
        throw new Error('Failed to save changes');
      }
    } catch (error) {
      logger.error('Error saving theme settings:', error);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      });
    }
  }, [saveChanges, user, updateProfile, theme, lightTheme, darkTheme, backgroundImage, backgroundOpacity, toast]);

  // Cancel changes
  const handleCancelSettings = useCallback(() => {
    discardChanges();
    
    toast({
      title: "Changes discarded",
      description: "Your unsaved changes have been reverted",
    });
  }, [discardChanges, toast]);

  // Reset settings
  const handleResetSettings = useCallback(async () => {
    try {
      const success = await resetToDefaults();
      
      if (success) {
        toast({
          title: "Settings reset",
          description: "Your theme settings have been reset to system defaults",
        });
      } else {
        throw new Error('Failed to reset settings');
      }
    } catch (error) {
      logger.error('Error resetting theme settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset settings. Please try again.",
      });
    }
  }, [resetToDefaults, toast]);

  return {
    handleLightThemeChange,
    handleDarkThemeChange,
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    handleSaveSettings,
    handleCancelSettings,
    handleResetSettings,
    handleThemeChange,
    isBackgroundLoading
  };
};
