
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors, ThemeSettings } from '@/types/theme';
import { unifiedThemeController } from '@/services/unified-theme-controller';
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
  
  // Get state from unified controller
  const [controllerState, setControllerState] = useState(() => unifiedThemeController.getState());
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  
  // Safely access profile and updateProfile with fallbacks
  const profile = authContext?.profile || null;
  const updateProfile = authContext?.updateProfile || (() => Promise.resolve());
  
  // Initialize controller when theme system is ready
  useEffect(() => {
    const initializeController = async () => {
      // Wait for theme system to be ready
      if (!isThemeReady || isThemeLoaded) return;

      try {
        let userSettings: ThemeSettings | null = null;
        
        // Load from user profile if available
        if (profile?.theme_settings) {
          try {
            userSettings = JSON.parse(profile.theme_settings);
            logger.info('Parsed theme settings from profile', { 
              module: 'use-theme',
              hasBackground: !!userSettings?.backgroundImage,
              backgroundOpacity: userSettings?.backgroundOpacity
            });
          } catch (e) {
            logger.warn('Failed to parse user theme settings:', e, { module: 'use-theme' });
          }
        }
        
        // Initialize the unified controller with user settings
        await unifiedThemeController.initialize(userSettings);
        
        // Update local state from controller after initialization
        const newState = unifiedThemeController.getState();
        setControllerState(newState);
        setIsThemeLoaded(true);
        
        logger.info('Theme context initialized successfully', { 
          module: 'use-theme',
          backgroundImage: !!newState.backgroundImage,
          backgroundOpacity: newState.backgroundOpacity
        });
      } catch (error) {
        logger.error('Error initializing theme context:', error, { module: 'use-theme' });
        setIsThemeLoaded(true); // Still mark as loaded to prevent infinite loading
      }
    };

    initializeController();
  }, [isThemeReady, profile?.theme_settings, isThemeLoaded]);

  // Subscribe to controller changes
  useEffect(() => {
    if (!isThemeLoaded) return;

    const unsubscribe = unifiedThemeController.subscribe((newState) => {
      setControllerState(newState);
      logger.info('Theme context updated from controller', { 
        module: 'use-theme',
        backgroundImage: !!newState.backgroundImage,
        backgroundOpacity: newState.backgroundOpacity
      });
    });

    return unsubscribe;
  }, [isThemeLoaded]);
  
  // Theme management functions
  const handleThemeChange = (newTheme: Theme) => {
    unifiedThemeController.setMode(newTheme);
    
    // Save to profile if available
    if (profile && updateProfile) {
      try {
        const themeSettings = unifiedThemeController.createThemeSettings();
        updateProfile({ theme_settings: JSON.stringify(themeSettings) });
      } catch (error) {
        logger.error('Failed to save theme mode:', error);
      }
    }
  };
  
  const resetTheme = () => {
    logger.info('Resetting theme to defaults', { module: 'use-theme' });
    window.location.reload();
  };
  
  const applyThemeColors = (colors: ThemeColors) => {
    if (controllerState.mode === 'light') {
      unifiedThemeController.setLightTheme(colors);
    } else {
      unifiedThemeController.setDarkTheme(colors);
    }
  };
  
  const applyBackground = (image: string | null, opacity: number) => {
    logger.info('Applying background through theme context', { 
      module: 'use-theme',
      hasImage: !!image,
      opacity
    });
    
    // Apply through unified controller immediately
    unifiedThemeController.setBackgroundImage(image);
    unifiedThemeController.setBackgroundOpacity(opacity);
    
    // Save to profile if available
    if (profile && updateProfile) {
      try {
        const themeSettings = unifiedThemeController.createThemeSettings();
        updateProfile({ theme_settings: JSON.stringify(themeSettings) });
        logger.info('Background settings saved to profile', { module: 'use-theme' });
      } catch (error) {
        logger.error('Failed to save background settings:', error);
      }
    }
  };
  
  // Get current theme colors with fallbacks
  const currentThemeColors = controllerState.mode === 'dark' ? controllerState.darkTheme : controllerState.lightTheme;
  
  return (
    <ThemeContext.Provider
      value={{
        theme: controllerState.mode,
        setTheme: handleThemeChange,
        mode: controllerState.mode,
        setMode: handleThemeChange,
        resetTheme,
        isThemeLoaded: isThemeLoaded && isThemeReady,
        applyThemeColors,
        applyBackground,
        backgroundImage: controllerState.backgroundImage,
        backgroundOpacity: controllerState.backgroundOpacity,
        currentThemeColors,
        lightTheme: controllerState.lightTheme,
        darkTheme: controllerState.darkTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    // Provide a fallback to prevent crashes during initialization
    const fallbackState = unifiedThemeController.getState();
    return {
      theme: fallbackState.mode,
      setTheme: () => {},
      mode: fallbackState.mode,
      setMode: () => {},
      resetTheme: () => {},
      isThemeLoaded: false,
      applyThemeColors: () => {},
      applyBackground: () => {},
      backgroundImage: fallbackState.backgroundImage,
      backgroundOpacity: fallbackState.backgroundOpacity,
      currentThemeColors: fallbackState.lightTheme,
      lightTheme: fallbackState.lightTheme,
      darkTheme: fallbackState.darkTheme,
    } as ThemeContextType;
  }
  
  return context;
};
