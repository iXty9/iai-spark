
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';
import { fetchAppSettings, clearSettingsCache } from '@/services/admin/settingsService';
import { ThemeSettings } from '@/types/theme';

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
  const [defaultThemeSettings, setDefaultThemeSettings] = useState<ThemeSettings | null>(null);
  const [isDefaultThemeLoading, setIsDefaultThemeLoading] = useState(true);

  // Apply the theme mode without updating the profile
  const applyThemeMode = (newTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  // Fetch default theme settings separately to be available for all users
  const fetchDefaultThemeSettings = useCallback(async () => {
    setIsDefaultThemeLoading(true);
    try {
      logger.info('Fetching default theme settings for initialization', { 
        module: 'theme',
        isAnonymous: !user
      });
      
      const appSettings = await fetchAppSettings();
      if (appSettings.default_theme_settings) {
        try {
          const parsedTheme = JSON.parse(appSettings.default_theme_settings);
          logger.info('Default theme settings fetched successfully', { 
            module: 'theme',
            hasBackground: !!parsedTheme?.backgroundImage,
            themeMode: parsedTheme?.mode || 'unknown'
          });
          setDefaultThemeSettings(parsedTheme);
          return parsedTheme;
        } catch (e) {
          logger.error('Failed to parse default theme settings', e, { module: 'theme' });
        }
      } else {
        logger.info('No default theme settings found in database', { module: 'theme' });
      }
      return null;
    } catch (e) {
      logger.error('Error fetching default theme settings', e, { module: 'theme' });
      return null;
    } finally {
      setIsDefaultThemeLoading(false);
    }
  }, [user]);

  // Apply theme settings function - reused in multiple places
  const applyThemeSettings = useCallback((themeSettings: ThemeSettings | null, source: string) => {
    if (!themeSettings) {
      logger.info(`No theme settings to apply from ${source}`, { module: 'theme' });
      return false;
    }

    try {
      // Apply theme colors based on current mode
      const currentTheme = theme === 'light' 
        ? themeSettings.lightTheme 
        : themeSettings.darkTheme;
      
      if (currentTheme) {
        logger.info(`Applying ${theme} theme colors from ${source}`, { 
          module: 'theme',
          bg: currentTheme.backgroundColor.substring(0, 7) 
        });
        
        applyThemeChanges(currentTheme);
      }
      
      // Apply background image if it exists
      if (themeSettings.backgroundImage) {
        logger.info(`Applying background image from ${source}`, { module: 'theme' });
        const opacity = parseFloat(themeSettings.backgroundOpacity || '0.5');
        applyBackgroundImage(themeSettings.backgroundImage, opacity);
      } else {
        logger.info(`No background image in ${source} theme, removing any existing image`, { module: 'theme' });
        applyBackgroundImage(null, 0.5);
      }
      
      return true;
    } catch (e) {
      logger.error(`Error applying theme from ${source}`, e, { module: 'theme' });
      return false;
    }
  }, [theme]);

  // Refresh theme (useful when theme is changed elsewhere)
  const refreshTheme = useCallback(() => {
    clearSettingsCache(); // Clear settings cache to get fresh data
    fetchDefaultThemeSettings(); // Re-fetch default theme settings
  }, [fetchDefaultThemeSettings]);

  useEffect(() => {
    // Apply the theme mode (light/dark class)
    applyThemeMode(theme);
    
    // Fetch default theme settings first (will be available for all users)
    fetchDefaultThemeSettings();
  }, [fetchDefaultThemeSettings]);

  useEffect(() => {    
    const applyTheme = async () => {
      try {
        let themeApplied = false;
        
        // Step 1: Try to apply theme from user profile if logged in
        if (user && profile?.theme_settings) {
          logger.info('Trying to apply theme from user profile', { 
            module: 'theme',
            userId: user.id.substring(0, 8)
          });
          
          try {
            // Get theme settings from profile
            const userThemeSettings = JSON.parse(profile.theme_settings);
            themeApplied = applyThemeSettings(userThemeSettings, 'user profile');
            
            if (themeApplied) {
              logger.info('Successfully applied theme from user profile', { module: 'theme' });
              setIsThemeLoaded(true);
              return;
            }
          } catch (e) {
            logger.error('Error parsing user theme settings', e, { module: 'theme' });
          }
        }
        
        // Step 2: Apply default theme settings if no user theme was applied or user is not logged in
        if (!themeApplied) {
          // If default theme is still loading, wait a moment and check again
          if (isDefaultThemeLoading) {
            logger.info('Default theme still loading, waiting...', { module: 'theme' });
            
            // If default theme is taking too long, continue with basic theme
            setTimeout(() => {
              if (!isThemeLoaded) {
                logger.info('Applying basic theme after timeout', { module: 'theme' });
                setIsThemeLoaded(true);
              }
            }, 2000);
            
            return;
          }
          
          if (defaultThemeSettings) {
            logger.info('Applying admin-set default theme', { 
              module: 'theme',
              hasBackground: !!defaultThemeSettings.backgroundImage,
              isAnonymous: !user
            });
            
            themeApplied = applyThemeSettings(defaultThemeSettings, 'default settings');
            
            if (themeApplied) {
              logger.info('Successfully applied default theme', { module: 'theme' });
              setIsThemeLoaded(true);
              return;
            }
          } else {
            // No default theme exists in database yet
            logger.info('No default theme available in database', { module: 'theme' });
          }
        }
        
        // Step 3: If still no theme applied, use fallback CSS variables from theme.css
        if (!themeApplied) {
          logger.info('Using CSS fallback theme', { module: 'theme' });
          // System defaults are in theme.css, just apply blank background
          applyBackgroundImage(null, 0.5);
        }
        
        setIsThemeLoaded(true);
      } catch (e) {
        // Log errors but ensure theme is marked as loaded to prevent UI hangups
        emitDebugEvent({
          lastError: `Error processing theme settings`,
          lastAction: 'Theme initialization failed'
        });
        
        logger.error('Error during theme initialization', e, { module: 'theme' });
        setIsThemeLoaded(true);
      }
    };
    
    // Don't reapply if already loaded and theme hasn't changed
    if (!isThemeLoaded || defaultThemeSettings) {
      applyTheme();
    }
  }, [
    theme, 
    user, 
    profile, 
    isThemeLoaded, 
    defaultThemeSettings,
    isDefaultThemeLoading,
    applyThemeSettings
  ]);

  return { theme, setTheme, isThemeLoaded, refreshTheme };
}
