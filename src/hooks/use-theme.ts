
import { useState, useEffect } from 'react';
import { centralizedThemeService } from '@/services/centralized-theme-service';
import { ThemeColors } from '@/types/theme';

export const useTheme = () => {
  const [themeState, setThemeState] = useState(() => centralizedThemeService.getState());

  useEffect(() => {
    const unsubscribe = centralizedThemeService.subscribe(setThemeState);
    return unsubscribe;
  }, []);

  const currentTheme = themeState.mode === 'dark' ? themeState.darkTheme : themeState.lightTheme;

  return {
    currentTheme,
    mode: themeState.mode,
    isReady: themeState.isReady
  };
};
