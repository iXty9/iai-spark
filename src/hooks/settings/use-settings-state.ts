
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors } from '@/types/theme';
import { logger } from '@/utils/logging';
import { useTheme } from '@/hooks/use-theme';

export interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

export const useSettingsState = () => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.5); // 50% as default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo>({});
  
  // Default light theme colors with company branding
  const defaultLightTheme: ThemeColors = {
    backgroundColor: '#ffffff',
    primaryColor: '#dd3333', // Company primary color
    textColor: '#000000',
    accentColor: '#9b87f5',
    userBubbleColor: '#dd3333', // Company primary color
    aiBubbleColor: '#9b87f5',
    userBubbleOpacity: 0.3,
    aiBubbleOpacity: 0.3,
    userTextColor: '#000000',
    aiTextColor: '#000000'
  };
  
  // Default dark theme colors with company branding
  const defaultDarkTheme: ThemeColors = {
    backgroundColor: '#121212',
    primaryColor: '#dd3333', // Company primary color
    textColor: '#ffffff',
    accentColor: '#9b87f5',
    userBubbleColor: '#dd3333', // Company primary color
    aiBubbleColor: '#9b87f5',
    userBubbleOpacity: 0.3,
    aiBubbleOpacity: 0.3,
    userTextColor: '#ffffff',
    aiTextColor: '#ffffff'
  };
  
  const [lightTheme, setLightTheme] = useState<ThemeColors>(defaultLightTheme);
  const [darkTheme, setDarkTheme] = useState<ThemeColors>(defaultDarkTheme);

  // Wrapper functions to track changes
  const updateLightTheme = (newTheme: ThemeColors) => {
    setLightTheme(newTheme);
    setHasChanges(true);
  };
  
  const updateDarkTheme = (newTheme: ThemeColors) => {
    setDarkTheme(newTheme);
    setHasChanges(true);
  };
  
  const updateBackgroundImage = (image: string | null, info?: ImageInfo) => {
    setBackgroundImage(image);
    if (info) {
      setImageInfo(info);
    }
    setHasChanges(true);
  };
  
  const updateBackgroundOpacity = (opacity: number) => {
    setBackgroundOpacity(opacity);
    setHasChanges(true);
  };

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
          // FIXED: Ensure proper number type handling
          const opacity = typeof themeSettings.backgroundOpacity === 'string'
            ? parseFloat(themeSettings.backgroundOpacity)
            : themeSettings.backgroundOpacity;
          if (!isNaN(opacity)) {
            setBackgroundOpacity(opacity);
            logger.info('Loaded background opacity', { module: 'settings', opacity });
          }
        }
        
        // Load light theme colors
        if (themeSettings.lightTheme) {
          setLightTheme({
            ...defaultLightTheme,
            ...themeSettings.lightTheme,
            userBubbleOpacity: parseFloat(themeSettings.lightTheme.userBubbleOpacity) || 0.3,
            aiBubbleOpacity: parseFloat(themeSettings.lightTheme.aiBubbleOpacity) || 0.3,
            userTextColor: themeSettings.lightTheme.userTextColor || themeSettings.lightTheme.textColor,
            aiTextColor: themeSettings.lightTheme.aiTextColor || themeSettings.lightTheme.textColor
          });
        }
        
        // Load dark theme colors
        if (themeSettings.darkTheme) {
          setDarkTheme({
            ...defaultDarkTheme,
            ...themeSettings.darkTheme,
            userBubbleOpacity: parseFloat(themeSettings.darkTheme.userBubbleOpacity) || 0.3,
            aiBubbleOpacity: parseFloat(themeSettings.darkTheme.aiBubbleOpacity) || 0.3,
            userTextColor: themeSettings.darkTheme.userTextColor || themeSettings.darkTheme.textColor,
            aiTextColor: themeSettings.darkTheme.aiTextColor || themeSettings.darkTheme.textColor
          });
        }
        
        // Load image info if available
        if (themeSettings.imageInfo) {
          setImageInfo(themeSettings.imageInfo);
        }
        
        setHasChanges(false);
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
    hasChanges,
    imageInfo,
    setLightTheme: updateLightTheme,
    setDarkTheme: updateDarkTheme, 
    setBackgroundImage: updateBackgroundImage,
    setBackgroundOpacity: updateBackgroundOpacity,
    setIsSubmitting,
    setHasChanges,
    setImageInfo: (info: ImageInfo) => setImageInfo(info)
  };
};
