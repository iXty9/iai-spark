import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors } from '@/types/theme';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isThemeLoaded: boolean;
  applyThemeColors: (colors: ThemeColors) => void;
  applyBackground: (backgroundImage: string | null, opacity: number) => void;
  backgroundImage: string | null;
  backgroundOpacity: number;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // State
  const { profile, updateProfile } = useAuth();
  const [theme, setTheme] = useState<Theme>('light');
  const [isThemeLoaded, setIsThemeLoaded] = useState<boolean>(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.5);
  
  // Load theme from profile or localStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Always check localStorage first for theme mode (light/dark)
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        
        if (storedTheme) {
          setTheme(storedTheme);
        }
        
        // If user is authenticated, try to load theme preferences from profile
        if (profile?.theme_settings) {
          try {
            const themeSettings = JSON.parse(profile.theme_settings);
            
            // Check if we should update the theme mode from profile
            if (themeSettings.mode && !storedTheme) {
              setTheme(themeSettings.mode);
            }
            
            // Load background if available
            if (themeSettings.backgroundImage) {
              setBackgroundImage(themeSettings.backgroundImage);
            }
            
            if (themeSettings.backgroundOpacity !== undefined) {
              const opacity = parseFloat(themeSettings.backgroundOpacity);
              if (!isNaN(opacity)) {
                setBackgroundOpacity(opacity);
              }
            }
          } catch (e) {
            console.error('Error parsing theme settings from profile:', e);
          }
        } else {
          // If no user profile or no theme settings, try to load default theme from app settings
          try {
            const appSettings = await fetchAppSettings();
            if (appSettings.default_theme_settings) {
              const defaultTheme = JSON.parse(appSettings.default_theme_settings);
              
              // Apply default theme mode if no stored theme
              if (defaultTheme.mode && !storedTheme) {
                setTheme(defaultTheme.mode);
              }
              
              // Apply default background if available and no background from profile
              if (defaultTheme.backgroundImage && !backgroundImage) {
                setBackgroundImage(defaultTheme.backgroundImage);
              }
              
              if (defaultTheme.backgroundOpacity !== undefined && backgroundOpacity === 0.5) {
                const opacity = parseFloat(defaultTheme.backgroundOpacity);
                if (!isNaN(opacity)) {
                  setBackgroundOpacity(opacity);
                }
              }
            }
          } catch (e) {
            // Fail silently for app settings as they are optional
            console.log('Could not load default theme from app settings');
          }
        }
      } finally {
        setIsThemeLoaded(true);
      }
    };
    
    loadTheme();
  }, [profile]);
  
  // Apply theme to document when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove old class and add new class
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Store in localStorage
    localStorage.setItem('theme', theme);
    
    // Log theme change for debugging
    const debugEvent = {
      type: 'theme_change',
      theme,
      timestamp: new Date().toISOString(),
      // Remove the problematic property that caused TS2353 error
      // themeMode was not defined in the DebugEvent type
    };
    
    logger.info('Theme changed', debugEvent);
  }, [theme]);
  
  // Apply background to document
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (backgroundImage) {
      root.style.setProperty('--bg-image-url', `url(${backgroundImage})`);
      root.style.setProperty('--bg-opacity', backgroundOpacity.toString());
      root.classList.add('has-bg-image');
    } else {
      root.style.removeProperty('--bg-image-url');
      root.style.removeProperty('--bg-opacity');
      root.classList.remove('has-bg-image');
    }
  }, [backgroundImage, backgroundOpacity]);
  
  // Handle theme change
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    
    // Update profile if available
    if (profile) {
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
  
  // Apply theme colors from theme settings (for custom colors)
  const applyThemeColors = (colors: ThemeColors) => {
    // Apply theme colors to CSS variables
    const root = window.document.documentElement;
    
    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        // Convert camelCase to kebab-case for CSS variables
        const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(`--${cssVar}`, value.toString());
      }
    });
  };
  
  // Apply background
  const applyBackground = (image: string | null, opacity: number) => {
    setBackgroundImage(image);
    setBackgroundOpacity(opacity);
    
    // Update profile if available
    if (profile) {
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
