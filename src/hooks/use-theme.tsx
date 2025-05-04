
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
  const [reloadCount, setReloadCount] = useState(0); // Track reload attempts

  // Apply the theme mode without updating the profile
  const applyThemeMode = useCallback((newTheme: Theme) => {
    const root = window.document.documentElement;
    
    // Ensure CSS classes are properly updated
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
    
    logger.info(`Applied theme mode: ${newTheme}`, { module: 'theme' });
    
    // If we have default theme settings, re-apply the colors for the new mode
    if (defaultThemeSettings) {
      try {
        const currentTheme = newTheme === 'light' 
          ? defaultThemeSettings.lightTheme 
          : defaultThemeSettings.darkTheme;
        
        if (currentTheme) {
          logger.info(`Re-applying ${newTheme} theme colors after theme mode change`, { 
            module: 'theme',
            mode: newTheme
          });
          applyThemeChanges(currentTheme);
          
          // Also reapply background if it exists
          if (defaultThemeSettings.backgroundImage) {
            const opacity = parseFloat(defaultThemeSettings.backgroundOpacity || '0.5');
            applyBackgroundImage(defaultThemeSettings.backgroundImage, opacity);
          }
        }
      } catch (err) {
        logger.error('Error re-applying theme colors after mode change:', err, { module: 'theme' });
      }
    }
  }, [defaultThemeSettings]);
  
  // Update theme mode when it changes
  useEffect(() => {
    applyThemeMode(theme);
  }, [theme, applyThemeMode]);
  
  // Fetch default theme settings separately to be available for all users
  const fetchDefaultThemeSettings = useCallback(async () => {
    setIsDefaultThemeLoading(true);
    try {
      logger.info('Fetching default theme settings for initialization', { 
        module: 'theme',
        isAnonymous: !user
      });
      
      // Force clear cache to ensure we get fresh data
      clearSettingsCache();
      
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
      // Set theme mode first if specified
      if (themeSettings.mode && themeSettings.mode !== theme) {
        logger.info(`Setting theme mode to ${themeSettings.mode} from ${source}`, { module: 'theme' });
        setTheme(themeSettings.mode);
      }
      
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
  const refreshTheme = useCallback(async () => {
    logger.info('Manually refreshing theme settings', { module: 'theme', reloadCount });
    
    // Clear settings cache to get fresh data
    clearSettingsCache();
    setReloadCount(count => count + 1);
    
    // Re-fetch default theme settings
    const freshSettings = await fetchDefaultThemeSettings();
    
    // Apply the freshly fetched settings immediately
    if (freshSettings) {
      applyThemeSettings(freshSettings, 'refresh operation');
    } else {
      // If no settings found, ensure theme mode is at least applied
      applyThemeMode(theme);
    }
    
    // Mark theme as loaded to trigger any dependent UI updates
    setIsThemeLoaded(true);
  }, [fetchDefaultThemeSettings, applyThemeSettings, applyThemeMode, theme, reloadCount]);

  // Initialize default theme settings on mount
  useEffect(() => {
    // Initialize theme on mount
    logger.info('Initializing theme settings', { module: 'theme' });
    fetchDefaultThemeSettings();
  }, [fetchDefaultThemeSettings]);

  // Apply themes based on user status and available settings
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
        
        // Step 2: Apply default theme settings for anonymous users or if no user theme was applied
        if (!themeApplied) {
          if (defaultThemeSettings) {
            logger.info('Applying admin-set default theme', { 
              module: 'theme',
              hasBackground: !!defaultThemeSettings.backgroundImage,
              isAnonymous: !user
            });
            
            // Force apply the default theme settings
            themeApplied = applyThemeSettings(defaultThemeSettings, 'default settings');
            
            if (themeApplied) {
              logger.info('Successfully applied default theme', { module: 'theme' });
              setIsThemeLoaded(true);
              return;
            } else {
              logger.warn('Failed to apply default theme settings', { module: 'theme' });
            }
          } else if (!isDefaultThemeLoading) {
            // Check if default theme settings are still loading
            logger.info('No default theme settings loaded yet, fetching again', { module: 'theme' });
            
            // Try fetching one more time to be sure
            const freshSettings = await fetchDefaultThemeSettings();
            
            if (freshSettings) {
              themeApplied = applyThemeSettings(freshSettings, 'freshly fetched default settings');
              
              if (themeApplied) {
                logger.info('Successfully applied freshly fetched default theme', { module: 'theme' });
                setIsThemeLoaded(true);
                return;
              }
            } else {
              // No default theme exists in database yet
              logger.info('No default theme available in database after retry', { module: 'theme' });
            }
          } else {
            logger.info('Default theme still loading, waiting...', { module: 'theme' });
            
            // For anonymous users, we'll retry once more with a short delay
            if (!user && reloadCount < 2) {
              setTimeout(() => {
                setReloadCount(count => count + 1);
                refreshTheme();
              }, 500);
            }
          }
        }
        
        // Step 3: If still no theme applied, ensure theme mode is set and use fallback CSS variables from theme.css
        if (!themeApplied) {
          logger.info('Using CSS fallback theme', { module: 'theme' });
          // Apply theme mode to ensure dark/light is set correctly
          applyThemeMode(theme);
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
    
    // Apply theme settings whenever they change or when theme mode changes
    applyTheme();
  }, [
    theme, 
    user, 
    profile, 
    defaultThemeSettings,
    isDefaultThemeLoading,
    applyThemeSettings,
    fetchDefaultThemeSettings,
    applyThemeMode,
    reloadCount,
    refreshTheme
  ]);

  return { theme, setTheme, isThemeLoaded, refreshTheme };
}
