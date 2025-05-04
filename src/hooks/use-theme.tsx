
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';
import { fetchAppSettings } from '@/services/admin/settingsService';

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
    
    const applyUserTheme = async () => {
      try {
        let themeApplied = false;
        
        if (user && profile) {
          logger.info('Applying theme from user profile', { module: 'theme' });
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
              themeApplied = true;
            }
            
            // Apply background image and opacity if they exist
            if (themeSettings.backgroundImage) {
              const opacity = parseFloat(themeSettings.backgroundOpacity || '0.5');
              applyBackgroundImage(themeSettings.backgroundImage, opacity);
            } else {
              applyBackgroundImage(null, 0.5);
            }
          }
        }
        
        // If no user theme was applied, fetch and apply default theme settings
        if (!themeApplied) {
          logger.info('Applying default theme settings for anonymous or new user', { module: 'theme' });
          
          try {
            // Fetch app settings to get default theme
            const appSettings = await fetchAppSettings();
            
            if (appSettings && appSettings.default_theme_settings) {
              const defaultThemeSettings = JSON.parse(appSettings.default_theme_settings);
              
              // Apply theme colors based on current mode
              const currentTheme = theme === 'light' 
                ? defaultThemeSettings.lightTheme 
                : defaultThemeSettings.darkTheme;
              
              if (currentTheme) {
                logger.info('Applying default theme colors', { module: 'theme' });
                applyThemeChanges(currentTheme);
              }
              
              // Apply background image if it exists
              if (defaultThemeSettings.backgroundImage) {
                logger.info('Applying default background image', { module: 'theme' });
                const opacity = parseFloat(defaultThemeSettings.backgroundOpacity || '0.5');
                applyBackgroundImage(defaultThemeSettings.backgroundImage, opacity);
              } else {
                applyBackgroundImage(null, 0.5);
              }
            } else {
              logger.info('No default theme settings found, using hardcoded defaults', { module: 'theme' });
              // Fall back to hardcoded defaults if no default theme settings exist
              applyBackgroundImage(null, 0.5);
            }
          } catch (e) {
            logger.error('Error fetching or applying default theme settings', e, { module: 'theme' });
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
    };
    
    applyUserTheme();
  }, [theme, user, profile]);

  return { theme, setTheme };
}
