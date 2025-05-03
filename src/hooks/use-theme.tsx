
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';

type Theme = 'dark' | 'light';

export function useTheme() {
  const { user, profile } = useAuth();
  const [theme, setTheme] = useState<Theme>(
    () => {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
        return savedTheme;
      }
      
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
  );

  // Apply the theme mode without updating the profile
  const applyThemeMode = (newTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    // Apply the theme mode (light/dark class)
    applyThemeMode(theme);
    
    if (user && profile) {
      try {
        // Get existing theme settings or create new ones
        let themeSettings = profile.theme_settings 
          ? JSON.parse(profile.theme_settings) 
          : null;
        
        if (themeSettings) {
          // Apply theme colors based on current mode without updating the profile
          const currentTheme = theme === 'light' 
            ? themeSettings.lightTheme 
            : themeSettings.darkTheme;
          
          // Only apply CSS variables if theme colors exist
          if (currentTheme) {
            // Update CSS variables with theme colors
            applyThemeChanges(currentTheme);
          }
          
          // Apply background image and opacity if they exist
          if (themeSettings.backgroundImage) {
            const opacity = parseFloat(themeSettings.backgroundOpacity || '0.5');
            applyBackgroundImage(themeSettings.backgroundImage, opacity);
          } else {
            applyBackgroundImage(null, 0.5);
          }
        }
      } catch (e) {
        // Use emitDebugEvent and logger for errors
        emitDebugEvent({
          lastError: `Error processing theme settings`,
          lastAction: 'Theme parse failed'
        });
        
        logger.error('Error processing theme settings', e, { module: 'theme' });
      }
    }
  }, [theme, user, profile]);

  return { theme, setTheme };
}
