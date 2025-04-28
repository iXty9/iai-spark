
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/AuthContext';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { ThemeColors } from '@/types/theme';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { SettingsTabs } from '@/components/settings/SettingsTabs';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user, profile, updateProfile } = useAuth();
  
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [lightTheme, setLightTheme] = useState<ThemeColors>({
    backgroundColor: '#ffffff',
    primaryColor: '#ea384c',
    textColor: '#000000',
    accentColor: '#9b87f5',
    userBubbleColor: '#ea384c',
    aiBubbleColor: '#9b87f5'
  });
  
  const [darkTheme, setDarkTheme] = useState<ThemeColors>({
    backgroundColor: '#121212',
    primaryColor: '#ea384c',
    textColor: '#ffffff',
    accentColor: '#9b87f5',
    userBubbleColor: '#ea384c',
    aiBubbleColor: '#9b87f5'
  });

  useEffect(() => {
    try {
      if (profile?.theme_settings) {
        try {
          const themeSettings = JSON.parse(profile.theme_settings);
          
          if (themeSettings.mode) {
            setTheme(themeSettings.mode);
          }
          
          if (themeSettings.lightTheme) {
            setLightTheme(themeSettings.lightTheme);
          }
          
          if (themeSettings.darkTheme) {
            setDarkTheme(themeSettings.darkTheme);
          }
          
          if (themeSettings.backgroundImage) {
            setBackgroundImage(themeSettings.backgroundImage);
          }
          
          if (themeSettings.backgroundOpacity !== undefined) {
            setBackgroundOpacity(parseFloat(themeSettings.backgroundOpacity));
          }
        } catch (e) {
          console.error('Error parsing theme settings from profile:', e);
        }
      }
    } catch (error) {
      console.error('Error loading saved theme settings:', error);
    }
  }, [profile, setTheme]);

  const handleLightThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLightTheme(prev => ({ ...prev, [name]: value }));
  };

  const handleDarkThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDarkTheme(prev => ({ ...prev, [name]: value }));
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
      
      if (user) {
        await updateProfile({ theme_settings: JSON.stringify(themeSettings) });
      }
      
      // Update CSS variables for immediate visual feedback
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
      console.error('Error saving theme settings:', errorMessage);
      
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
    setLightTheme({
      backgroundColor: '#ffffff',
      primaryColor: '#ea384c',
      textColor: '#000000',
      accentColor: '#9b87f5',
      userBubbleColor: '#ea384c',
      aiBubbleColor: '#9b87f5'
    });
    
    setDarkTheme({
      backgroundColor: '#121212',
      primaryColor: '#ea384c',
      textColor: '#ffffff',
      accentColor: '#9b87f5',
      userBubbleColor: '#ea384c',
      aiBubbleColor: '#9b87f5'
    });
    
    setBackgroundImage(null);
    setBackgroundOpacity(0.1);
    
    if (user) {
      updateProfile({ theme_settings: null })
        .then(() => {
          toast({
            title: "Settings reset",
            description: "Your theme settings have been reset to defaults",
          });
        })
        .catch((error) => {
          console.error('Error resetting theme settings in profile:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to reset settings. Please try again.",
          });
        });
    } else {
      toast({
        title: "Settings reset",
        description: "Your theme settings have been reset to defaults",
      });
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <SettingsHeader onGoBack={handleGoBack} />
        <CardContent>
          <SettingsTabs 
            appearanceContent={
              <AppearanceSettings
                theme={theme}
                lightTheme={lightTheme}
                darkTheme={darkTheme}
                onThemeChange={value => setTheme(value)}
                onLightThemeChange={handleLightThemeChange}
                onDarkThemeChange={handleDarkThemeChange}
              />
            }
            backgroundContent={
              <BackgroundSettings
                backgroundImage={backgroundImage}
                backgroundOpacity={backgroundOpacity}
                onBackgroundImageUpload={handleBackgroundImageUpload}
                onOpacityChange={value => setBackgroundOpacity(value[0])}
                onRemoveBackground={() => setBackgroundImage(null)}
              />
            }
          />
        </CardContent>
        <SettingsFooter 
          onReset={handleResetSettings} 
          onCancel={handleGoBack} 
          onSave={handleSaveSettings}
        />
      </Card>
    </div>
  );
}
