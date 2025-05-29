import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { ThemeColors } from '@/types/theme';
import { productionThemeService } from '@/services/production-theme-service';
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
      // Create theme settings from production theme service
      const themeSettings = productionThemeService.createThemeSettings();
      
      logger.info('Saving theme settings to database', { 
        module: 'settings',
        backgroundOpacity: backgroundOpacity,
        hasBackground: !!backgroundImage,
        userId: user?.id
      });

      if (user && updateProfile) {
        const result = await updateProfile({ theme_settings: JSON.stringify(themeSettings) });
        
        if (result?.success) {
          logger.info('Settings saved successfully to profile', { module: 'settings' });

          toast({
            title: "Settings saved",
            description: "Your theme settings have been saved successfully",
          });
          
          // Reset changes flag after successful save
          setHasChanges(false);
        } else {
          throw new Error(result?.error?.message || 'Failed to update profile');
        }
      } else {
        // Fallback to localStorage
        localStorage.setItem('theme_settings', JSON.stringify(themeSettings));
        
        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved to local storage",
        });
        
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
      // Use the production theme service to load default theme
      const success = await productionThemeService.loadDefaultTheme();
      
      if (success) {
        // Update local state to match the loaded default theme
        const newState = productionThemeService.getState();
        setLightTheme(newState.lightTheme);
        setDarkTheme(newState.darkTheme);
        setBackgroundImage(newState.backgroundImage);
        setBackgroundOpacity(newState.backgroundOpacity);
        
        toast({
          title: "Settings reset",
          description: "Your theme settings have been reset to system defaults",
        });
      } else {
        // Fall back to hardcoded defaults if no database defaults found
        logger.info('No default theme found in database, using hardcoded defaults', { module: 'settings' });
        resetToHardcodedDefaults();
        
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
  
  // Helper function to reset to hardcoded defaults with company branding
  const resetToHardcodedDefaults = () => {
    logger.info('Resetting to factory defaults with company branding', { module: 'settings' });
    
    const defaultLightTheme = {
      backgroundColor: '#ffffff',
      primaryColor: '#dd3333', // Company primary color
      textColor: '#000000',
      accentColor: '#9b87f5',
      userBubbleColor: '#dd3333', // Company primary color
      aiBubbleColor: '#9b87f5',
      userBubbleOpacity: 0.3,
      aiBubbleOpacity: 0.3,
      userTextColor: '#000000',
      aiTextColor: '#000000',
      userNameColor: '#666666',
      aiNameColor: '#666666'
    };
    
    const defaultDarkTheme = {
      backgroundColor: '#121212',
      primaryColor: '#dd3333', // Company primary color
      textColor: '#ffffff',
      accentColor: '#9b87f5',
      userBubbleColor: '#dd3333', // Company primary color
      aiBubbleColor: '#9b87f5',
      userBubbleOpacity: 0.3,
      aiBubbleOpacity: 0.3,
      userTextColor: '#ffffff',
      aiTextColor: '#ffffff',
      userNameColor: '#cccccc',
      aiNameColor: '#cccccc'
    };
    
    // Update production theme service
    productionThemeService.setLightTheme(defaultLightTheme);
    productionThemeService.setDarkTheme(defaultDarkTheme);
    productionThemeService.setBackgroundImage(null);
    productionThemeService.setBackgroundOpacity(0.5);
    
    // Update local state
    setLightTheme(defaultLightTheme);
    setDarkTheme(defaultDarkTheme);
    setBackgroundImage(null);
    setBackgroundOpacity(0.5);
  };

  return {
    isSubmitting,
    setIsSubmitting,
    handleSaveSettings,
    handleResetSettings
  };
};
