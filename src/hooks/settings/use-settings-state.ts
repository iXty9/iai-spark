
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors } from '@/types/theme';

export const useSettingsState = () => {
  const { profile } = useAuth();
  
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.5); // 50% as default
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [lightTheme, setLightTheme] = useState<ThemeColors>({
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
  });
  
  const [darkTheme, setDarkTheme] = useState<ThemeColors>({
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
  });

  useEffect(() => {
    try {
      if (profile?.theme_settings) {
        try {
          const themeSettings = JSON.parse(profile.theme_settings);
          
          if (themeSettings.mode) {
            // Theme mode is handled by useTheme hook
          }
          
          if (themeSettings.lightTheme) {
            setLightTheme({
              ...lightTheme,
              ...themeSettings.lightTheme,
              userBubbleOpacity: themeSettings.lightTheme.userBubbleOpacity ?? 0.3,
              aiBubbleOpacity: themeSettings.lightTheme.aiBubbleOpacity ?? 0.3,
              userTextColor: themeSettings.lightTheme.userTextColor ?? themeSettings.lightTheme.textColor,
              aiTextColor: themeSettings.lightTheme.aiTextColor ?? themeSettings.lightTheme.textColor
            });
          }
          
          if (themeSettings.darkTheme) {
            setDarkTheme({
              ...darkTheme,
              ...themeSettings.darkTheme,
              userBubbleOpacity: themeSettings.darkTheme.userBubbleOpacity ?? 0.3,
              aiBubbleOpacity: themeSettings.darkTheme.aiBubbleOpacity ?? 0.3,
              userTextColor: themeSettings.darkTheme.userTextColor ?? themeSettings.darkTheme.textColor,
              aiTextColor: themeSettings.darkTheme.aiTextColor ?? themeSettings.darkTheme.textColor
            });
          }
          
          if (themeSettings.backgroundImage) {
            setBackgroundImage(themeSettings.backgroundImage);
          }
          
          if (themeSettings.backgroundOpacity !== undefined) {
            setBackgroundOpacity(parseFloat(themeSettings.backgroundOpacity));
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error parsing theme settings from profile:', e);
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading saved theme settings:', error);
      }
    }
  }, [profile]);

  return {
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity,
    isSubmitting,
    setLightTheme,
    setDarkTheme, 
    setBackgroundImage,
    setBackgroundOpacity,
    setIsSubmitting
  };
};
