
import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeColors } from '@/types/theme';
import { unifiedThemeService, UnifiedThemeState } from '@/services/unified-theme-service';
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
  currentTheme: ThemeColors;
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const UnifiedThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<UnifiedThemeState>(() => unifiedThemeService.getState());
  const [isInitializing, setIsInitializing] = useState(true);
  
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        if (!state.isReady) {
          await unifiedThemeService.initialize();
        }
      } catch (error) {
        logger.error('Failed to initialize unified theme service', error);
      } finally {
        setIsInitializing(false);
      }
    };

    const unsubscribe = unifiedThemeService.subscribe((newState) => {
      setState(newState);
      if (newState.isReady) {
        setIsInitializing(false);
      }
    });

    initializeTheme();

    return unsubscribe;
  }, []);
  
  const resetTheme = () => {
    logger.info('Resetting theme to defaults');
    unifiedThemeService.loadDefaultTheme();
  };
  
  const applyThemeColors = (colors: ThemeColors) => {
    if (state.mode === 'light') {
      unifiedThemeService.setLightTheme(colors);
    } else {
      unifiedThemeService.setDarkTheme(colors);
    }
  };
  
  const applyBackground = (image: string | null, opacity: number) => {
    unifiedThemeService.setBackgroundImage(image);
    unifiedThemeService.setBackgroundOpacity(opacity);
  };
  
  const currentThemeColors = unifiedThemeService.getCurrentTheme();
  
  if (isInitializing && !state.isReady) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    );
  }
  
  return (
    <ThemeContext.Provider
      value={{
        theme: state.mode,
        setTheme: unifiedThemeService.setMode.bind(unifiedThemeService),
        mode: state.mode,
        setMode: unifiedThemeService.setMode.bind(unifiedThemeService),
        resetTheme,
        isThemeLoaded: state.isReady,
        applyThemeColors,
        applyBackground,
        backgroundImage: state.backgroundImage,
        backgroundOpacity: state.backgroundOpacity,
        currentThemeColors,
        currentTheme: currentThemeColors,
        lightTheme: state.lightTheme,
        darkTheme: state.darkTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useUnifiedTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    const fallbackState = unifiedThemeService.getState();
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
      currentTheme: fallbackState.lightTheme,
      lightTheme: fallbackState.lightTheme,
      darkTheme: fallbackState.darkTheme,
    } as ThemeContextType;
  }
  
  return context;
};
