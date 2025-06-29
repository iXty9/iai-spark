
import { useState, useEffect } from 'react';
import { centralizedThemeService, CentralizedThemeState } from '@/services/centralized-theme-service';
import { ThemeColors } from '@/types/theme';

export const useCentralizedTheme = () => {
  const [themeState, setThemeState] = useState<CentralizedThemeState>(() => centralizedThemeService.getState());

  useEffect(() => {
    const unsubscribe = centralizedThemeService.subscribe((newState) => {
      setThemeState(newState);
    });

    return unsubscribe;
  }, []);

  // Return interface for general app usage (non-preview values)
  return {
    theme: themeState.mode,
    lightTheme: themeState.lightTheme,
    darkTheme: themeState.darkTheme,
    backgroundImage: themeState.backgroundImage,
    backgroundOpacity: themeState.backgroundOpacity,
    isReady: themeState.isReady,
    isInPreview: themeState.isInPreview,
    
    // Theme control methods
    setTheme: (mode: 'light' | 'dark') => {
      centralizedThemeService.setThemeMode(mode);
    },
    
    // NEW: Synchronization methods
    syncWithExternalChange: (mode: 'light' | 'dark') => {
      centralizedThemeService.syncWithExternalThemeChange(mode);
    },
    
    recoverFromDesync: () => {
      centralizedThemeService.recoverFromDesync();
    }
  };
};
