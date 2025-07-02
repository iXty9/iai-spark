import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { ThemeColors } from '@/types/theme';
import { useTheme } from '@/contexts/SupaThemeContext';
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
  const { saveChanges, resetToDefaults } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultThemeSettings, setDefaultThemeSettings] = useState<any>(null);

  // Fetch default theme settings on component mount
  useEffect(() => {
    const getDefaultThemeSettings = async () => {
      try {
        logger.info('Fetching default theme settings', { module: 'settings' });
        const appSettings = await fetchAppSettings();
        if (appSettings.default_theme_settings) {
          const parsedSettings = JSON.parse(appSettings.default_theme_settings);
          logger.info('Default theme settings loaded successfully', { 
            module: 'settings',
            hasBackground: !!parsedSettings.backgroundImage,
            mode: parsedSettings.mode
          });
          setDefaultThemeSettings(parsedSettings);
        }
      } catch (error) {
        logger.error('Failed to fetch default theme settings', error, { module: 'settings' });
      }
    };
    
    getDefaultThemeSettings();
  }, []);

  // Validate theme settings before saving
  const validateThemeSettings = (): boolean => {
    const themesToValidate = [lightTheme, darkTheme];
    
    for (const themeToValidate of themesToValidate) {
      const colorProps = [
        'backgroundColor', 'primaryColor', 'textColor', 'accentColor', 
        'userBubbleColor', 'aiBubbleColor', 'userTextColor', 'aiTextColor'
      ];
      
      for (const prop of colorProps) {
        const value = themeToValidate[prop as keyof ThemeColors] as string;
        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
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
      logger.info('Saving theme settings using supa-themes', { 
        module: 'settings',
        userId: user?.id
      });

      const success = await saveChanges();
      
      if (success) {
        logger.info('Settings saved successfully', { module: 'settings' });
        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved successfully",
        });
        setHasChanges(false);
      } else {
        throw new Error('Failed to save theme settings');
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
      logger.info('Resetting theme settings using supa-themes', { module: 'settings' });
      
      const success = await resetToDefaults();
      
      if (success) {
        toast({
          title: "Settings reset",
          description: "Your theme settings have been reset to system defaults",
        });
        setHasChanges(false); // Reset saves automatically
      } else {
        throw new Error('Failed to reset theme settings');
      }
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
