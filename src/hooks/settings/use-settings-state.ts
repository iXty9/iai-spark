
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors } from '@/types/theme';
import { logger } from '@/utils/logging';

export const useSettingsState = () => {
  const { profile } = useAuth();
  
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.5); // 50% as default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
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
    if (profile?.theme_settings) {
      try {
        setIsLoading(true);
        logger.info('Loading theme settings from profile', { module: 'settings' });
        const themeSettings = JSON.parse(profile.theme_settings);
        
        // Load background image and opacity
        if (themeSettings.backgroundImage) {
          logger.info('Found background image in theme settings', { module: 'settings' });
          setBackgroundImage(themeSettings.backgroundImage);
        }
        
        if (themeSettings.backgroundOpacity !== undefined) {
          const opacity = parseFloat(themeSettings.backgroundOpacity);
          if (!isNaN(opacity)) {
            setBackgroundOpacity(opacity);
          }
        }
        
        // Load theme colors
        if (themeSettings.lightTheme) {
          setLightTheme({
            ...lightTheme,
            ...themeSettings.lightTheme,
            userBubbleOpacity: parseFloat(themeSettings.lightTheme.userBubbleOpacity) || 0.3,
            aiBubbleOpacity: parseFloat(themeSettings.lightTheme.aiBubbleOpacity) || 0.3,
            userTextColor: themeSettings.lightTheme.userTextColor || themeSettings.lightTheme.textColor,
            aiTextColor: themeSettings.lightTheme.aiTextColor || themeSettings.lightTheme.textColor
          });
        }
        
        if (themeSettings.darkTheme) {
          setDarkTheme({
            ...darkTheme,
            ...themeSettings.darkTheme,
            userBubbleOpacity: parseFloat(themeSettings.darkTheme.userBubbleOpacity) || 0.3,
            aiBubbleOpacity: parseFloat(themeSettings.darkTheme.aiBubbleOpacity) || 0.3,
            userTextColor: themeSettings.darkTheme.userTextColor || themeSettings.darkTheme.textColor,
            aiTextColor: themeSettings.darkTheme.aiTextColor || themeSettings.darkTheme.textColor
          });
        }
        setIsLoading(false);
      } catch (e) {
        logger.error('Error parsing theme settings from profile:', e, { module: 'settings' });
        setIsLoading(false);
      }
    } else {
      logger.info('No theme settings found in profile', { module: 'settings' });
      setIsLoading(false);
    }
  }, [profile]);

  return {
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity,
    isSubmitting,
    isLoading,
    setLightTheme,
    setDarkTheme, 
    setBackgroundImage,
    setBackgroundOpacity,
    setIsSubmitting
  };
};
