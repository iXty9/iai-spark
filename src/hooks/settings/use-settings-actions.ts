import { emitDebugEvent } from '@/utils/debug-events';
import { ThemeColors } from '@/types/theme';

interface UseSettingsActionsProps {
  user: any;
  theme: 'light' | 'dark';
  toast: any;
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  isSubmitting: boolean;
  setLightTheme: (theme: ThemeColors) => void;
  setDarkTheme: (theme: ThemeColors) => void;
  setBackgroundImage: (image: string | null) => void;
  setBackgroundOpacity: (opacity: number) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updateProfile?: (data: any) => Promise<any>;
}

export const useSettingsActions = ({
  user,
  theme,
  toast,
  lightTheme,
  darkTheme,
  backgroundImage,
  backgroundOpacity,
  isSubmitting,
  setLightTheme,
  setDarkTheme,
  setBackgroundImage,
  setBackgroundOpacity,
  setIsSubmitting,
  setTheme,
  updateProfile
}: UseSettingsActionsProps) => {

  const handleLightThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedTheme: ThemeColors = {
      ...lightTheme,
      [name]: value
    };
    setLightTheme(updatedTheme);
  };

  const handleDarkThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedTheme: ThemeColors = {
      ...darkTheme,
      [name]: value
    };
    setDarkTheme(updatedTheme);
  };

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        setBackgroundImage(event.target.result.toString());
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const themeSettings = {
        mode: theme,
        lightTheme,
        darkTheme,
        backgroundImage,
        backgroundOpacity: backgroundOpacity.toString()
      };
      
      if (user && updateProfile) {
        await updateProfile({ theme_settings: JSON.stringify(themeSettings) });
      } else {
        localStorage.setItem('theme_settings', JSON.stringify(themeSettings));
      }
      
      const root = window.document.documentElement;
      const currentTheme = theme === 'light' ? lightTheme : darkTheme;
      
      root.style.setProperty('--background-color', currentTheme.backgroundColor);
      root.style.setProperty('--primary-color', currentTheme.primaryColor);
      root.style.setProperty('--text-color', currentTheme.textColor);
      root.style.setProperty('--accent-color', currentTheme.accentColor);
      root.style.setProperty('--user-bubble-color', currentTheme.userBubbleColor || currentTheme.primaryColor);
      root.style.setProperty('--ai-bubble-color', currentTheme.aiBubbleColor || currentTheme.accentColor);
      
      toast({
        title: "Settings saved",
        description: "Your theme settings have been saved successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving theme settings:', errorMessage);
      }
      
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
    const defaultLightTheme = {
      backgroundColor: '#ffffff',
      primaryColor: '#ea384c',
      textColor: '#000000',
      accentColor: '#9b87f5',
      userBubbleColor: '#ea384c',
      aiBubbleColor: '#9b87f5'
    };
    
    const defaultDarkTheme = {
      backgroundColor: '#121212',
      primaryColor: '#ea384c',
      textColor: '#ffffff',
      accentColor: '#9b87f5',
      userBubbleColor: '#ea384c',
      aiBubbleColor: '#9b87f5'
    };
    
    setLightTheme(defaultLightTheme);
    setDarkTheme(defaultDarkTheme);
    setBackgroundImage(null);
    setBackgroundOpacity(0.1);
    
    if (user && updateProfile) {
      updateProfile({ theme_settings: null })
        .then(() => {
          toast({
            title: "Settings reset",
            description: "Your theme settings have been reset to defaults",
          });
        })
        .catch((error: Error) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error resetting theme settings in profile:', error);
          }
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to reset settings. Please try again.",
          });
        });
    } else {
      localStorage.removeItem('theme_settings');
      toast({
        title: "Settings reset",
        description: "Your theme settings have been reset to defaults",
      });
    }
  };

  return {
    handleLightThemeChange,
    handleDarkThemeChange,
    handleBackgroundImageUpload,
    handleSaveSettings,
    handleResetSettings
  };
};
