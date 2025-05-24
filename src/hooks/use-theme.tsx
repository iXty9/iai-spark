
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors, ThemeSettings } from '@/types/theme';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mode: Theme;
  setMode: (mode: Theme) => void;
  resetTheme: () => void;
  importTheme: (themeJson: string) => boolean;
  exportTheme: () => string;
  validateTheme: (themeJson: string) => boolean;
  isThemeLoaded: boolean;
  applyThemeColors: (colors: ThemeColors) => void;
  applyBackground: (backgroundImage: string | null, opacity: number) => void;
  backgroundImage: string | null;
  backgroundOpacity: number;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const authContext = useAuth();
  const [theme, setTheme] = useState<Theme>('light');
  const [isThemeLoaded, setIsThemeLoaded] = useState<boolean>(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.5);
  
  // Safely access profile and updateProfile, handling case where auth isn't ready
  const profile = authContext?.profile || null;
  const updateProfile = authContext?.updateProfile || (() => Promise.resolve());
  
  // Load theme - simplified logic
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Get stored theme preference
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        if (storedTheme) {
          setTheme(storedTheme);
        }
        
        // Load theme settings from profile or defaults
        let themeSettings = null;
        
        if (profile?.theme_settings) {
          try {
            themeSettings = JSON.parse(profile.theme_settings);
          } catch (e) {
            logger.warn('Failed to parse theme settings from profile', e);
          }
        }
        
        // If no profile theme, try app defaults
        if (!themeSettings) {
          try {
            const appSettings = await fetchAppSettings();
            if (appSettings.default_theme_settings) {
              themeSettings = JSON.parse(appSettings.default_theme_settings);
            }
          } catch (e) {
            // Fail silently for app settings
          }
        }
        
        // Apply theme settings if available
        if (themeSettings) {
          if (themeSettings.mode && !storedTheme) {
            setTheme(themeSettings.mode);
          }
          
          if (themeSettings.lightTheme && themeSettings.darkTheme) {
            const currentThemeColors = themeSettings.mode === 'dark' ? 
              themeSettings.darkTheme : themeSettings.lightTheme;
            applyThemeChanges(currentThemeColors);
          }
          
          if (themeSettings.backgroundImage) {
            setBackgroundImage(themeSettings.backgroundImage);
          }
          
          if (themeSettings.backgroundOpacity !== undefined) {
            const opacity = parseFloat(themeSettings.backgroundOpacity);
            if (!isNaN(opacity)) {
              setBackgroundOpacity(opacity);
            }
          }
        }
      } finally {
        setIsThemeLoaded(true);
      }
    };
    
    loadTheme();
  }, [profile]);
  
  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Apply background
  useEffect(() => {
    applyBackgroundImage(backgroundImage, backgroundOpacity);
  }, [backgroundImage, backgroundOpacity]);
  
  // Simplified theme functions
  const mode = theme;
  const setMode = setTheme;
  
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    
    if (profile && updateProfile) {
      let themeSettings;
      try {
        themeSettings = profile.theme_settings ? JSON.parse(profile.theme_settings) : {};
      } catch (e) {
        themeSettings = {};
      }
      
      themeSettings.mode = newTheme;
      updateProfile({ theme_settings: JSON.stringify(themeSettings) });
    }
  };
  
  const resetTheme = () => {
    // Reset to system defaults
    const defaultLight = {
      backgroundColor: "#ffffff",
      primaryColor: "#007bff",
      textColor: "#333333",
      accentColor: "#ff4500",
      userBubbleColor: "#e1f5fe",
      aiBubbleColor: "#f5f5f5",
      userBubbleOpacity: 1,
      aiBubbleOpacity: 1,
      userTextColor: "#000000",
      aiTextColor: "#000000"
    };
    
    const defaultDark = {
      backgroundColor: "#121212",
      primaryColor: "#bb86fc",
      textColor: "#e0e0e0",
      accentColor: "#03dac6",
      userBubbleColor: "#31456a",
      aiBubbleColor: "#2d2d2d",
      userBubbleOpacity: 1,
      aiBubbleOpacity: 1,
      userTextColor: "#ffffff",
      aiTextColor: "#ffffff"
    };
    
    const currentTheme = theme === 'light' ? defaultLight : defaultDark;
    applyThemeChanges(currentTheme);
    
    if (profile && updateProfile) {
      let themeSettings;
      try {
        themeSettings = profile.theme_settings ? JSON.parse(profile.theme_settings) : {};
      } catch (e) {
        themeSettings = {};
      }
      
      themeSettings.lightTheme = defaultLight;
      themeSettings.darkTheme = defaultDark;
      updateProfile({ theme_settings: JSON.stringify(themeSettings) });
    }
  };
  
  const validateTheme = (themeJson: string): boolean => {
    try {
      const parsedTheme = JSON.parse(themeJson);
      const requiredProps = ['lightTheme', 'darkTheme', 'mode'];
      return requiredProps.every(prop => parsedTheme.hasOwnProperty(prop));
    } catch (e) {
      return false;
    }
  };
  
  const importTheme = (themeJson: string): boolean => {
    try {
      if (!validateTheme(themeJson)) return false;
      
      const parsedTheme = JSON.parse(themeJson) as ThemeSettings;
      
      if (parsedTheme.mode) {
        setTheme(parsedTheme.mode);
      }
      
      const currentThemeColors = theme === 'dark' ? 
        parsedTheme.darkTheme : parsedTheme.lightTheme;
        
      if (currentThemeColors) {
        applyThemeChanges(currentThemeColors);
      }
      
      if (profile && updateProfile) {
        updateProfile({ theme_settings: themeJson });
      }
      
      return true;
    } catch (e) {
      return false;
    }
  };
  
  const exportTheme = (): string => {
    try {
      let themeSettings: ThemeSettings = {
        mode: theme,
        lightTheme: {
          backgroundColor: "#ffffff",
          primaryColor: "#007bff",
          textColor: "#333333",
          accentColor: "#ff4500",
          userBubbleColor: "#e1f5fe",
          aiBubbleColor: "#f5f5f5",
          userBubbleOpacity: 1,
          aiBubbleOpacity: 1,
          userTextColor: "#000000",
          aiTextColor: "#000000"
        },
        darkTheme: {
          backgroundColor: "#121212",
          primaryColor: "#bb86fc",
          textColor: "#e0e0e0",
          accentColor: "#03dac6",
          userBubbleColor: "#31456a",
          aiBubbleColor: "#2d2d2d",
          userBubbleOpacity: 1,
          aiBubbleOpacity: 1,
          userTextColor: "#ffffff",
          aiTextColor: "#ffffff"
        },
        exportDate: new Date().toISOString()
      };
      
      if (profile?.theme_settings) {
        try {
          const profileSettings = JSON.parse(profile.theme_settings) as ThemeSettings;
          themeSettings = {
            ...themeSettings,
            ...profileSettings,
            exportDate: new Date().toISOString()
          };
        } catch (e) {
          // Use defaults
        }
      }
      
      return JSON.stringify(themeSettings, null, 2);
    } catch (e) {
      return JSON.stringify({
        error: "Failed to export theme"
      });
    }
  };
  
  const applyThemeColors = (colors: ThemeColors) => {
    applyThemeChanges(colors);
  };
  
  const applyBackground = (image: string | null, opacity: number) => {
    setBackgroundImage(image);
    setBackgroundOpacity(opacity);
    
    if (profile && updateProfile) {
      let themeSettings;
      try {
        themeSettings = profile.theme_settings ? JSON.parse(profile.theme_settings) : {};
      } catch (e) {
        themeSettings = {};
      }
      
      themeSettings.backgroundImage = image;
      themeSettings.backgroundOpacity = opacity;
      updateProfile({ theme_settings: JSON.stringify(themeSettings) });
    }
  };
  
  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: handleThemeChange,
        mode,
        setMode,
        resetTheme,
        importTheme,
        exportTheme,
        validateTheme,
        isThemeLoaded,
        applyThemeColors,
        applyBackground,
        backgroundImage,
        backgroundOpacity,
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
