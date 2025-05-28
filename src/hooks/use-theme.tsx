import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeColors, ThemeSettings } from '@/types/theme';
import { unifiedThemeController } from '@/services/unified-theme-controller';
import { backgroundStateManager } from '@/services/background-state-manager';
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
  const { isThemeReady, isClientReady, initializationPhase } = useThemeInitialization();
  
  // Get state from unified controller and background manager
  const [controllerState, setControllerState] = useState(() => unifiedThemeController.getState());
  const [backgroundState, setBackgroundState] = useState(() => backgroundStateManager.getState());
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  
  // Safely access profile and updateProfile with fallbacks
  const profile = authContext?.profile || null;
  const updateProfile = authContext?.updateProfile || (() => Promise.resolve());
  
  // Initialize when theme system is ready
  useEffect(() => {
    if (!isThemeReady || isThemeLoaded) return;

    try {
      // Theme system is already initialized by coordinated init service
      // Just sync local state
      const newState = unifiedThemeController.getState();
      setControllerState(newState);
      setIsThemeLoaded(true);
      
      logger.info('Theme context synced with initialized system', { 
        module: 'use-theme',
        backgroundImage: !!newState.backgroundImage,
        backgroundOpacity: newState.backgroundOpacity,
        initializationPhase
      });
    } catch (error) {
      logger.error('Error syncing theme context:', error, { module: 'use-theme' });
      setIsThemeLoaded(true);
    }
  }, [isThemeReady, isThemeLoaded, initializationPhase]);

  // Subscribe to controller and background changes
  useEffect(() => {
    if (!isThemeLoaded) return;

    const unsubscribeController = unifiedThemeController.subscribe((newState) => {
      setControllerState(newState);
      logger.info('Theme context updated from controller', { 
        module: 'use-theme',
        backgroundImage: !!newState.backgroundImage,
        backgroundOpacity: newState.backgroundOpacity
      });
    });

    const unsubscribeBackground = backgroundStateManager.subscribe((newBackgroundState) => {
      setBackgroundState(newBackgroundState);
      logger.info('Background state updated in theme context', { 
        module: 'use-theme',
        isApplied: newBackgroundState.isApplied,
        hasImage: !!newBackgroundState.image
      });
    });

    return () => {
      unsubscribeController();
      unsubscribeBackground();
    };
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
        isThemeLoaded: isThemeLoaded && isThemeReady && isClientReady,
        applyThemeColors,
        applyBackground,
        backgroundImage: backgroundState.image,
        backgroundOpacity: backgroundState.opacity,
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
    const fallbackBackgroundState = backgroundStateManager.getState();
    return {
      theme: fallbackState.mode,
      setTheme: () => {},
      mode: fallbackState.mode,
      setMode: () => {},
      resetTheme: () => {},
      isThemeLoaded: false,
      applyThemeColors: () => {},
      applyBackground: () => {},
      backgroundImage: fallbackBackgroundState.image,
      backgroundOpacity: fallbackBackgroundState.opacity,
      currentThemeColors: fallbackState.lightTheme,
      lightTheme: fallbackState.lightTheme,
      darkTheme: fallbackState.darkTheme,
    } as ThemeContextType;
  }
  
  return context;
};
