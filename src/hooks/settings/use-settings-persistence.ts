
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { ThemeColors } from '@/types/theme';
import { applyThemeChanges, applyBackgroundImage, createThemeSettingsObject } from '@/utils/theme-utils';
import { fetchAppSettings } from '@/services/admin/settingsService';

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
  setHasChanges: (hasChanges: boolean) => void;
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
  setHasChanges,
  updateProfile
}: UseSettingsPersistenceProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultThemeSettings, setDefaultThemeSettings] = useState<any>(null);

  // Fetch default theme settings on component mount
  useEffect(() => {
    const getDefaultThemeSettings = async () => {
      try {
        const appSettings = await fetchAppSettings();
        if (appSettings.default_theme_settings) {
          const parsedSettings = JSON.parse(appSettings.default_theme_settings);
          setDefaultThemeSettings(parsedSettings);
        }
      } catch (error) {
        logger.error('Failed to fetch default theme settings', error, { module: 'settings' });
      }
    };
    
    getDefaultThemeSettings();
  }, []);

  // Validate color format
  const isValidColor = (color: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  // Validate theme settings before saving
  const validateThemeSettings = (): boolean => {
    // Validate both themes regardless of current mode
    const themesToValidate = [lightTheme, darkTheme];
    
    for (const themeToValidate of themesToValidate) {
      const colorProps = [
        'backgroundColor', 
        'primaryColor', 
        'textColor', 
        'accentColor', 
        'userBubbleColor', 
        'aiBubbleColor',
        'userTextColor',
        'aiTextColor'
      ];
      
      for (const prop of colorProps) {
        if (!isValidColor(themeToValidate[prop as keyof ThemeColors] as string)) {
          toast({
            variant: "destructive",
            title: "Invalid color format",
            description: `The ${prop} must be a valid hex color (e.g. #FFFFFF)`,
          });
          return false;
        }
      }
    }
    
    return true;
  };

  const handleSaveSettings = async () => {
    if (isSubmitting) return;
    
    // Validate settings before saving
    if (!validateThemeSettings()) return;
    
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
        
        // Reset changes flag after successful save
        setHasChanges(false);
      } else {
        // Fallback to localStorage if no updateProfile function is available
        localStorage.setItem('theme_settings', JSON.stringify(themeSettings));
        
        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved to local storage",
        });
        
        // Reset changes flag after successful save
        setHasChanges(false);
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

  const handleResetSettings = async () => {
    setIsSubmitting(true);
    
    try {
      // Try to use admin-set default theme first
      if (defaultThemeSettings) {
        // Use admin-set default theme
        setLightTheme(defaultThemeSettings.lightTheme);
        setDarkTheme(defaultThemeSettings.darkTheme);
        setBackgroundImage(defaultThemeSettings.backgroundImage);
        setBackgroundOpacity(parseFloat(defaultThemeSettings.backgroundOpacity || '0.5'));
        
        // Apply the default theme immediately
        const currentTheme = theme === 'light' ? defaultThemeSettings.lightTheme : defaultThemeSettings.darkTheme;
        applyThemeChanges(currentTheme);
        
        // Apply background from default theme
        applyBackgroundImage(
          defaultThemeSettings.backgroundImage, 
          parseFloat(defaultThemeSettings.backgroundOpacity || '0.5')
        );
        
        toast({
          title: "Settings reset",
          description: "Your theme settings have been reset to system defaults",
        });
      } else {
        // Fall back to hard-coded defaults if no admin defaults exist
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
          description: "Your theme settings have been reset to factory defaults",
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
    isSubmitting,
    setIsSubmitting,
    handleSaveSettings,
    handleResetSettings
  };
};
