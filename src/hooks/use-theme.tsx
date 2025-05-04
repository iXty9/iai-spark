
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
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

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
        
        // STEP 1: Try to apply theme from user profile if logged in
        if (user && profile?.theme_settings) {
          logger.info('Applying theme from user profile', { module: 'theme' });
          try {
            // Get existing theme settings
            const themeSettings = JSON.parse(profile.theme_settings);
            
            if (themeSettings) {
              // Apply theme colors based on current mode
              const currentTheme = theme === 'light' 
                ? themeSettings.lightTheme 
                : themeSettings.darkTheme;
              
              // Only apply CSS variables if theme colors exist
              if (currentTheme) {
                // Update CSS variables with theme colors
                applyThemeChanges(currentTheme);
                themeApplied = true;
                logger.info('Applied theme from user profile', { 
                  module: 'theme',
                  theme: theme,
                  hasBackground: !!themeSettings.backgroundImage
                });
              }
              
              // Apply background image and opacity if they exist
              if (themeSettings.backgroundImage) {
                const opacity = parseFloat(themeSettings.backgroundOpacity || '0.5');
                applyBackgroundImage(themeSettings.backgroundImage, opacity);
                logger.info('Applied background from user profile', { module: 'theme' });
              } else {
                applyBackgroundImage(null, 0.5);
              }
            }
          } catch (e) {
            logger.error('Error parsing user theme settings', e, { module: 'theme' });
          }
        }
        
        // STEP 2: If no user theme was applied or user is not logged in, fetch and apply default theme settings
        if (!themeApplied) {
          logger.info('Looking for default theme settings', { 
            module: 'theme',
            isAnonymous: !user,
            hasProfile: !!profile
          });
          
          try {
            // Fetch app settings to get default theme
            const appSettings = await fetchAppSettings();
            
            if (appSettings && appSettings.default_theme_settings) {
              const defaultThemeSettings = JSON.parse(appSettings.default_theme_settings);
              
              if (defaultThemeSettings) {
                logger.info('Found default theme settings in app_settings', { 
                  module: 'theme',
                  hasBackgroundImage: !!defaultThemeSettings.backgroundImage 
                });
                
                // Apply theme colors based on current mode
                const currentTheme = theme === 'light' 
                  ? defaultThemeSettings.lightTheme 
                  : defaultThemeSettings.darkTheme;
                
                if (currentTheme) {
                  logger.info('Applying default theme colors', { module: 'theme', theme });
                  applyThemeChanges(currentTheme);
                  themeApplied = true;
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
                logger.info('Default theme settings were empty or invalid', { module: 'theme' });
              }
            } else {
              logger.info('No default theme settings found in app_settings', { module: 'theme' });
            }
          } catch (e) {
            logger.error('Error fetching or applying default theme settings', e, { module: 'theme' });
          }
        }
        
        // STEP 3: If still no theme applied, use hardcoded defaults as fallback
        if (!themeApplied) {
          logger.info('Using hardcoded default theme (fallback)', { module: 'theme' });
          // System defaults are in theme.css, just apply blank background
          applyBackgroundImage(null, 0.5);
        }
        
        setIsThemeLoaded(true);
      } catch (e) {
        // Use emitDebugEvent and logger for errors
        emitDebugEvent({
          lastError: `Error processing theme settings`,
          lastAction: 'Theme parse failed'
        });
        
        logger.error('Error processing theme settings', e, { module: 'theme' });
        setIsThemeLoaded(true);
      }
    };
    
    applyUserTheme();
  }, [theme, user, profile]);

  return { theme, setTheme, isThemeLoaded };
}
