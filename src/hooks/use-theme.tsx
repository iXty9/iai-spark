import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors, ThemeSettings } from '@/types/theme';
import { themeService } from '@/services/theme-service';
import { useThemeInitialization } from '@/hooks/use-theme-initialization';
import { logger } from '@/utils/logging';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mode: Theme;
  setMode: (mode: Theme) => void;
  resetTheme: () => void;
  isThemeLoaded: boolean;
  applyThemeColors: (colors: ThemeColors) => void;
  applyBackground: (backgroundImage: string | null, opacity: number) => void;
  backgroundImage: string | null;
  backgroundOpacity: number;
  currentThemeColors: ThemeColors;
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const authContext = useAuth();
  const { isThemeReady } = useThemeInitialization();
  
  const [theme, setTheme] = useState<Theme>(() => {
    // Get initial theme from localStorage or default to light
    return themeService.getStoredThemeMode() || 'light';
  });
  
  const [isThemeLoaded, setIsThemeLoaded] = useState<boolean>(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.5);
  const [lightTheme, setLightTheme] = useState<ThemeColors>(() => 
    themeService.getDefaultThemeColors('light')
  );
  const [darkTheme, setDarkTheme] = useState<ThemeColors>(() => 
    themeService.getDefaultThemeColors('dark')
  );
  
  // Safely access profile and updateProfile
  const profile = authContext?.profile || null;
  const updateProfile = authContext?.updateProfile || (() => Promise.resolve());
  
  // Load theme settings when profile is available or theme service is ready
  useEffect(() => {
    const loadThemeSettings = async () => {
      if (!isThemeReady) return;

      try {
        let themeSettings: ThemeSettings | null = null;
        
        // Try to load from user profile first (for signed-in users)
        if (profile?.theme_settings) {
          try {
            themeSettings = JSON.parse(profile.theme_settings);
            logger.info('Loaded theme from user profile', { module: 'use-theme' });
          } catch (e) {
            logger.warn('Failed to parse user theme settings', e);
          }
        }
        
        // Fall back to admin defaults (for signed-out users or users without custom themes)
        if (!themeSettings) {
          themeSettings = themeService.getAdminDefaults();
          if (themeSettings) {
            logger.info('Using admin default theme', { module: 'use-theme' });
          }
        }
        
        // Apply theme settings if found
        if (themeSettings && themeService.validateThemeSettings(themeSettings)) {
          // Update theme mode if specified
          if (themeSettings.mode) {
            setTheme(themeSettings.mode);
          }
          
          // Update theme colors
          if (themeSettings.lightTheme) {
            setLightTheme(themeSettings.lightTheme);
          }
          if (themeSettings.darkTheme) {
            setDarkTheme(themeSettings.darkTheme);
          }
          
          // Update background settings - fix type conversion here
          if (themeSettings.backgroundImage) {
            setBackgroundImage(themeSettings.backgroundImage);
          }
          if (themeSettings.backgroundOpacity !== undefined) {
            const opacity = typeof themeSettings.backgroundOpacity === 'string' 
              ? parseFloat(themeSettings.backgroundOpacity)
              : themeSettings.backgroundOpacity;
            if (!isNaN(opacity)) {
              setBackgroundOpacity(opacity);
            }
          }
          
          // Apply the current theme immediately
          const currentColors = themeSettings.mode === 'dark' 
            ? (themeSettings.darkTheme || darkTheme)
            : (themeSettings.lightTheme || lightTheme);
          
          themeService.applyThemeImmediate(currentColors, themeSettings.mode || theme);
          
          // Apply background if present - fix type conversion here
          if (themeSettings.backgroundImage) {
            const bgOpacity = typeof themeSettings.backgroundOpacity === 'string'
              ? parseFloat(themeSettings.backgroundOpacity || '0.5')
              : (themeSettings.backgroundOpacity || 0.5);
            themeService.applyBackground(themeSettings.backgroundImage, bgOpacity);
          }
        }
        
        setIsThemeLoaded(true);
      } catch (error) {
        logger.error('Error loading theme settings:', error, { module: 'use-theme' });
        setIsThemeLoaded(true); // Still mark as loaded to prevent infinite loading
      }
    };

    loadThemeSettings();
  }, [isThemeReady, profile, theme, lightTheme, darkTheme]);
  
  // Apply theme changes when theme or colors change
  useEffect(() => {
    if (!isThemeLoaded) return;
    
    const currentColors = theme === 'dark' ? darkTheme : lightTheme;
    themeService.applyThemeImmediate(currentColors, theme);
  }, [theme, lightTheme, darkTheme, isThemeLoaded]);
  
  // Apply background when background settings change
  useEffect(() => {
    if (!isThemeLoaded) return;
    themeService.applyBackground(backgroundImage, backgroundOpacity);
  }, [backgroundImage, backgroundOpacity, isThemeLoaded]);
  
  // Theme management functions
  const mode = theme;
  const setMode = setTheme;
  
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    
    if (profile && updateProfile) {
      try {
        const existingSettings = profile.theme_settings ? JSON.parse(profile.theme_settings) : {};
        const updatedSettings = { ...existingSettings, mode: newTheme };
        updateProfile({ theme_settings: JSON.stringify(updatedSettings) });
      } catch (error) {
        logger.error('Failed to save theme mode:', error);
      }
    }
  };
  
  const resetTheme = () => {
    const adminDefaults = themeService.getAdminDefaults();
    
    if (adminDefaults) {
      // Use admin defaults
      setLightTheme(adminDefaults.lightTheme || themeService.getDefaultThemeColors('light'));
      setDarkTheme(adminDefaults.darkTheme || themeService.getDefaultThemeColors('dark'));
      setBackgroundImage(adminDefaults.backgroundImage || null);
      // Fix type conversion here
      const opacity = typeof adminDefaults.backgroundOpacity === 'string'
        ? parseFloat(adminDefaults.backgroundOpacity || '0.5')
        : (adminDefaults.backgroundOpacity || 0.5);
      setBackgroundOpacity(opacity);
    } else {
      // Use built-in defaults
      setLightTheme(themeService.getDefaultThemeColors('light'));
      setDarkTheme(themeService.getDefaultThemeColors('dark'));
      setBackgroundImage(null);
      setBackgroundOpacity(0.5);
    }
  };
  
  const applyThemeColors = (colors: ThemeColors) => {
    themeService.applyThemeImmediate(colors, theme);
  };
  
  const applyBackground = (image: string | null, opacity: number) => {
    setBackgroundImage(image);
    setBackgroundOpacity(opacity);
    
    if (profile && updateProfile) {
      try {
        const existingSettings = profile.theme_settings ? JSON.parse(profile.theme_settings) : {};
        const updatedSettings = {
          ...existingSettings,
          backgroundImage: image,
          backgroundOpacity: opacity.toString() // Always convert to string for storage
        };
        updateProfile({ theme_settings: JSON.stringify(updatedSettings) });
      } catch (error) {
        logger.error('Failed to save background settings:', error);
      }
    }
  };
  
  // Get current theme colors
  const currentThemeColors = theme === 'dark' ? darkTheme : lightTheme;
  
  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: handleThemeChange,
        mode,
        setMode,
        resetTheme,
        isThemeLoaded: isThemeLoaded && isThemeReady,
        applyThemeColors,
        applyBackground,
        backgroundImage,
        backgroundOpacity,
        currentThemeColors,
        lightTheme,
        darkTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};
