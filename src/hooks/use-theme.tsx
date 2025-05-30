
import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeColors } from '@/types/theme';
import { productionThemeService, ThemeState } from '@/services/production-theme-service';
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
  const [state, setState] = useState<ThemeState>(() => productionThemeService.getState());
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Initialize theme service and wait for it to be ready
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Only initialize if not already ready
        if (!state.isReady) {
          await productionThemeService.initialize();
        }
      } catch (error) {
        logger.error('Failed to initialize theme service', error, { module: 'theme-provider' });
      } finally {
        setIsInitializing(false);
      }
    };

    const unsubscribe = productionThemeService.subscribe((newState) => {
      setState(newState);
      if (newState.isReady) {
        setIsInitializing(false);
      }
    });

    initializeTheme();

    return unsubscribe;
  }, []);
  
  const resetTheme = () => {
    logger.info('Resetting theme to defaults', { module: 'theme-provider' });
    productionThemeService.loadDefaultTheme();
  };
  
  const applyThemeColors = (colors: ThemeColors) => {
    if (state.mode === 'light') {
      productionThemeService.setLightTheme(colors);
    } else {
      productionThemeService.setDarkTheme(colors);
    }
  };
  
  const applyBackground = (image: string | null, opacity: number) => {
    productionThemeService.setBackgroundImage(image);
    productionThemeService.setBackgroundOpacity(opacity);
  };
  
  const currentThemeColors = state.mode === 'dark' ? state.darkTheme : state.lightTheme;
  
  // Show minimal loading if theme is still initializing
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
        setTheme: productionThemeService.setMode.bind(productionThemeService),
        mode: state.mode,
        setMode: productionThemeService.setMode.bind(productionThemeService),
        resetTheme,
        isThemeLoaded: state.isReady,
        applyThemeColors,
        applyBackground,
        backgroundImage: state.backgroundImage,
        backgroundOpacity: state.backgroundOpacity,
        currentThemeColors,
        lightTheme: state.lightTheme,
        darkTheme: state.darkTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    const fallbackState = productionThemeService.getState();
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
