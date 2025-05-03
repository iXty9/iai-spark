
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { ThemeColors } from '@/types/theme';
import { applyThemeChanges, applyBackgroundImage, createThemeSettingsObject } from '@/utils/theme-utils';

export interface UseSettingsPersistenceProps {
  user: any;
  theme: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  setLightTheme: (theme: ThemeColors) => void;
  setDarkTheme: (theme: ThemeColors) => void;
  setBackgroundImage: (image: string | null) => void;
  setBackgroundOpacity: (opacity: number) => void;
  updateProfile?: (data: any) => Promise<any>;
}

export const useSettingsPersistence = ({
  user,
  theme,
  lightTheme,
  darkTheme,
  backgroundImage,
  backgroundOpacity,
  setLightTheme,
  setDarkTheme,
  setBackgroundImage,
  setBackgroundOpacity,
  updateProfile
}: UseSettingsPersistenceProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveSettings = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const themeSettings = createThemeSettingsObject(
        theme, 
        lightTheme, 
        darkTheme, 
        backgroundImage, 
        backgroundOpacity
      );
      
      // Apply the background image with the new opacity immediately
      applyBackgroundImage(backgroundImage, backgroundOpacity);
      
      // Apply current theme settings
      const currentTheme = theme === 'light' ? lightTheme : darkTheme;
      applyThemeChanges(currentTheme);

      if (user && updateProfile) {
        // Make sure we stringify the theme settings
        await updateProfile({ theme_settings: JSON.stringify(themeSettings) });
        
        logger.info('Settings saved successfully', { module: 'settings' });

        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved successfully",
        });
      } else {
        // Fallback to localStorage if no updateProfile function is available
        localStorage.setItem('theme_settings', JSON.stringify(themeSettings));
        
        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved to local storage",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error saving theme settings:', error, { module: 'settings' });
      
      emitDebugEvent({
        lastError: `Failed to save settings: ${errorMessage}`,
        lastAction: 'Settings save failed'
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSettings = () => {
    // Default theme settings
    const defaultLightTheme = {
      backgroundColor: '#ffffff',
      primaryColor: '#ea384c',
      textColor: '#000000',
      accentColor: '#9b87f5',
      userBubbleColor: '#ea384c',
      aiBubbleColor: '#9b87f5',
      userBubbleOpacity: 0.3,
      aiBubbleOpacity: 0.3,
      userTextColor: '#000000',
      aiTextColor: '#000000'
    };
    
    const defaultDarkTheme = {
      backgroundColor: '#121212',
      primaryColor: '#ea384c',
      textColor: '#ffffff',
      accentColor: '#9b87f5',
      userBubbleColor: '#ea384c',
      aiBubbleColor: '#9b87f5',
      userBubbleOpacity: 0.3,
      aiBubbleOpacity: 0.3,
      userTextColor: '#ffffff',
      aiTextColor: '#ffffff'
    };
    
    setLightTheme(defaultLightTheme);
    setDarkTheme(defaultDarkTheme);
    setBackgroundImage(null);
    setBackgroundOpacity(0.5);
    
    // Apply the reset theme immediately
    const currentTheme = theme === 'light' ? defaultLightTheme : defaultDarkTheme;
    applyThemeChanges(currentTheme);
    
    // Reset background
    applyBackgroundImage(null, 0.5);
    
    toast({
      title: "Settings reset",
      description: "Your theme settings have been reset to defaults",
    });
  };

  return {
    isSubmitting,
    setIsSubmitting,
    handleSaveSettings,
    handleResetSettings
  };
};
