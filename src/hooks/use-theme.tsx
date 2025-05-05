
import { useState, useEffect, useCallback } from 'react';
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
  const [isThemeLoading, setIsThemeLoading] = useState(false);
  const [lastBackgroundImage, setLastBackgroundImage] = useState<string | null>(null);

  // Apply the theme mode without updating the profile
  const applyThemeMode = (newTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Function to specifically apply background
  const applyBackgroundWithRetry = useCallback((imageUrl: string | null, opacity: number) => {
    if (imageUrl) {
      logger.info('Applying background image', { 
        module: 'theme', 
        imageUrl: imageUrl.substring(0, 30) + '...',
        opacity
      });
      
      // Store the last applied background
      setLastBackgroundImage(imageUrl);
      
      // For image URLs, preload the image first to ensure it loads properly
      if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
        const img = new Image();
        
        img.onload = () => {
          logger.info('Background image loaded successfully', { module: 'theme' });
          applyBackgroundImage(imageUrl, opacity);
        };
        
        img.onerror = () => {
          logger.error('Failed to load background image', null, { 
            module: 'theme',
            imageUrl: imageUrl.substring(0, 30) + '...' 
          });
          // If image fails to load, clear background
          applyBackgroundImage(null, opacity);
        };
        
        img.src = imageUrl;
      } else {
        // For non-URL backgrounds, apply directly
        applyBackgroundImage(imageUrl, opacity);
      }
    } else {
      // No background image, just clear it
      setLastBackgroundImage(null);
      applyBackgroundImage(null, opacity);
    }
  }, []);

  // Main effect to apply theme
  useEffect(() => {
    // Apply the theme mode (light/dark class)
    applyThemeMode(theme);
    
    const applyUserTheme = async () => {
      if (isThemeLoading) return; // Prevent concurrent loading
      
      setIsThemeLoading(true);
      try {
        let themeApplied = false;
        
        // STEP 1: Try to apply theme from user profile if logged in
        if (user && profile?.theme_settings) {
          logger.info('Applying theme from user profile', { 
            module: 'theme', 
            userId: user.id 
          });
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
                applyBackgroundWithRetry(themeSettings.backgroundImage, opacity);
                logger.info('Applied background from user profile', { module: 'theme' });
              } else {
                applyBackgroundWithRetry(null, 0.5);
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
            // Fetch app settings to get default theme with longer timeout for initial load
            const fetchTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Theme fetch timeout')), 5000)
            );
            
            const fetchSettingsPromise = fetchAppSettings();
            const appSettings = await Promise.race([fetchSettingsPromise, fetchTimeout]);
            
            // Add type check to ensure default_theme_settings exists before trying to access it
            if (appSettings && typeof appSettings === 'object' && 'default_theme_settings' in appSettings) {
              try {
                const defaultThemeSettingsStr = String(appSettings.default_theme_settings);
                const defaultThemeSettings = JSON.parse(defaultThemeSettingsStr);
                
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
                    applyBackgroundWithRetry(defaultThemeSettings.backgroundImage, opacity);
                  } else {
                    applyBackgroundWithRetry(null, 0.5);
                  }
                } else {
                  logger.info('Default theme settings were empty or invalid', { module: 'theme' });
                }
              } catch (parseError) {
                logger.error('Error parsing default theme settings JSON', parseError, { 
                  module: 'theme',
                  settings: typeof appSettings.default_theme_settings === 'string' 
                    ? appSettings.default_theme_settings.substring(0, 50) + '...' 
                    : typeof appSettings.default_theme_settings
                });
              }
            } else {
              logger.info('No default theme settings found in app_settings', { 
                module: 'theme',
                settingsKeys: appSettings ? Object.keys(appSettings) : 'no settings' 
              });
            }
          } catch (e) {
            logger.error('Error fetching or applying default theme settings', e, { module: 'theme' });
          }
        }
        
        // STEP 3: If still no theme applied, use hardcoded defaults as fallback
        if (!themeApplied) {
          logger.info('Using hardcoded default theme (fallback)', { module: 'theme' });
          // System defaults are in theme.css, just apply blank background
          applyBackgroundWithRetry(null, 0.5);
        }
        
        setIsThemeLoaded(true);
      } catch (e) {
        // Use emitDebugEvent and logger for errors
        emitDebugEvent({
          lastError: `Error processing theme settings`,
          lastAction: 'Theme parse failed'
        });
        
        logger.error('Error processing theme settings', e, { module: 'theme' });
        // Still set theme as loaded, even if there was an error
        setIsThemeLoaded(true);
      } finally {
        setIsThemeLoading(false);
      }
    };
    
    applyUserTheme();
  }, [theme, user, profile, isThemeLoading, applyBackgroundWithRetry]);

  // Function to manually reload the theme - useful for debugging
  const reloadTheme = useCallback(() => {
    logger.info('Manual theme reload requested', { module: 'theme' });
    setIsThemeLoaded(false);
    
    // Allow a small delay before starting to reload
    setTimeout(() => {
      // Reapply theme mode which will trigger the main effect
      applyThemeMode(theme);
    }, 100);
  }, [theme]);

  // Add effect to monitor DOM changes and ensure background is applied
  useEffect(() => {
    if (!lastBackgroundImage) return;
    
    // Create a timer to check if background is visible after theme loads
    if (isThemeLoaded) {
      const timer = setTimeout(() => {
        const body = document.body;
        const hasBackgroundImage = body.style.backgroundImage && 
                                   body.style.backgroundImage !== 'none';
        
        logger.info('Background visibility check', { 
          module: 'theme', 
          hasBackgroundImage,
          bodyHasBackgroundClass: body.classList.contains('with-bg-image'),
          currentBackgroundCSS: body.style.backgroundImage
        });
        
        // If background should be visible but isn't, reapply it
        if (lastBackgroundImage && !hasBackgroundImage) {
          logger.warn('Background image not visible, reapplying', { module: 'theme' });
          applyBackgroundWithRetry(lastBackgroundImage, 0.5);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isThemeLoaded, lastBackgroundImage, applyBackgroundWithRetry]);

  return { theme, setTheme, isThemeLoaded, reloadTheme };
}
