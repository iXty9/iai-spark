
import { ThemeColors } from '@/types/theme';
import { useThemeColorActions } from './use-theme-color-actions';
import { useBackgroundActions } from './use-background-actions';
import { productionThemeService } from '@/services/production-theme-service';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';
import { useState } from 'react';

interface UseSimplifiedSettingsActionsProps {
  user: any;
  theme: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  setHasChanges: (hasChanges: boolean) => void;
  updateProfile?: (data: any) => Promise<any>;
}

export const useSimplifiedSettingsActions = ({
  user,
  theme,
  lightTheme,
  darkTheme,
  backgroundImage,
  backgroundOpacity,
  setHasChanges,
  updateProfile
}: UseSimplifiedSettingsActionsProps) => {
  
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Theme color actions
  const { 
    handleLightThemeChange, 
    handleDarkThemeChange 
  } = useThemeColorActions({
    theme,
    lightTheme,
    darkTheme,
    setLightTheme: (theme) => {
      productionThemeService.setLightTheme(theme);
      setHasChanges(true);
    },
    setDarkTheme: (theme) => {
      productionThemeService.setDarkTheme(theme);
      setHasChanges(true);
    }
  });

  // Background actions
  const { 
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    isLoading: isBackgroundLoading
  } = useBackgroundActions({
    backgroundImage,
    backgroundOpacity,
    setBackgroundImage: (image) => {
      productionThemeService.setBackgroundImage(image);
      setHasChanges(true);
    },
    setBackgroundOpacity: (opacity) => {
      productionThemeService.setBackgroundOpacity(opacity);
      setHasChanges(true);
    }
  });
  
  // Handle theme change (light/dark toggle)
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    productionThemeService.setMode(newTheme);
    setHasChanges(true);
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const themeSettings = productionThemeService.createThemeSettings();
      
      logger.info('Saving theme settings', { 
        module: 'settings',
        backgroundOpacity: backgroundOpacity,
        hasBackground: !!backgroundImage
      });

      if (user && updateProfile) {
        await updateProfile({ theme_settings: JSON.stringify(themeSettings) });
        
        logger.info('Settings saved successfully to profile', { module: 'settings' });

        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved successfully",
        });
      } else {
        // Fallback to localStorage
        localStorage.setItem('theme_settings', JSON.stringify(themeSettings));
        
        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved to local storage",
        });
      }
      
      // Reset changes flag after successful save
      setHasChanges(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error saving theme settings:', error, { module: 'settings' });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset settings
  const handleResetSettings = async () => {
    setIsSubmitting(true);
    
    try {
      // Use the production theme service to load default theme
      const success = await productionThemeService.loadDefaultTheme();
      
      if (success) {
        toast({
          title: "Settings reset",
          description: "Your theme settings have been reset to system defaults",
        });
      } else {
        // Fall back to hardcoded defaults if no database defaults found
        logger.info('No default theme found in database, using hardcoded defaults', { module: 'settings' });
        
        toast({
          title: "Settings reset",
          description: "No default theme settings found in database. Reset to factory defaults.",
        });
      }
      
      // Mark as having changes that need to be saved
      setHasChanges(true);
    } catch (error) {
      logger.error('Error resetting theme settings:', error, { module: 'settings' });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset settings. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleLightThemeChange,
    handleDarkThemeChange,
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    handleSaveSettings,
    handleResetSettings,
    handleThemeChange,
    isBackgroundLoading,
    isSubmitting
  };
};
