
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';
import { fetchAppSettings } from '@/services/admin/settingsService';

type Theme = 'dark' | 'light';

// Global safety constants
const MAX_BACKGROUND_RETRIES = 2;
const THEME_LOAD_TIMEOUT = 8000;

export function useTheme() {
  const { user, profile } = useAuth();
  // Determine initial theme from localStorage or system preference
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
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Simplified state - reduce states that were causing cascading updates
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const loadAttemptRef = useRef(0);
  const bgRetryCountRef = useRef(0);
  const themeLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Apply the theme mode without updating the profile
  const applyThemeMode = useCallback((newTheme: Theme) => {
    const root = window.document.documentElement;
    
    // Remove both classes first to ensure clean state
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    
    // Update localStorage
    localStorage.setItem('theme', newTheme);
  }, []);

  // Simplified background image handler - fewer retries and verification steps
  const applyBackgroundWithRetry = useCallback((imageUrl: string | null, opacity: number) => {
    // Reset background if no image
    if (!imageUrl) {
      applyBackgroundImage(null, opacity);
      setIsBackgroundLoading(false);
      return;
    }
    
    // Limit retries to prevent infinite loops
    if (bgRetryCountRef.current >= MAX_BACKGROUND_RETRIES) {
      logger.warn('Max background retries reached, using fallback', { module: 'theme' });
      applyBackgroundImage(null, opacity);
      setIsBackgroundLoading(false);
      return;
    }
    
    setIsBackgroundLoading(true);
    
    logger.info('Applying background image', { 
      module: 'theme', 
      retryCount: bgRetryCountRef.current
    });
    
    // For image URLs, preload first
    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
      const img = new Image();
      
      img.onload = () => {
        // Apply the background directly
        applyBackgroundImage(imageUrl, opacity);
        setIsBackgroundLoading(false);
      };
      
      img.onerror = () => {
        logger.error('Failed to load background image', null, { module: 'theme' });
        applyBackgroundImage(null, opacity);
        setIsBackgroundLoading(false);
      };
      
      // Set source to start loading
      img.src = imageUrl;
      bgRetryCountRef.current++;
    } else {
      // For non-URL backgrounds, apply directly
      applyBackgroundImage(imageUrl, opacity);
      setIsBackgroundLoading(false);
    }
  }, []);

  // Main effect to apply theme with safety mechanisms
  useEffect(() => {
    // Clear any existing timeout when effect reruns
    if (themeLoadTimeoutRef.current) {
      clearTimeout(themeLoadTimeoutRef.current);
      themeLoadTimeoutRef.current = null;
    }
    
    // Apply theme mode first (light/dark class)
    applyThemeMode(theme);
    
    // Set up safety timeout
    themeLoadTimeoutRef.current = setTimeout(() => {
      if (isThemeLoading) {
        logger.warn('Theme loading timeout reached', { module: 'theme' });
        setIsThemeLoading(false);
        setIsThemeLoaded(true);
        setLoadError('Theme loading timed out. Using default theme.');
      }
    }, THEME_LOAD_TIMEOUT);
    
    // Only load theme if not already loaded or loading
    if (!isThemeLoaded && !isThemeLoading) {
      setIsThemeLoading(true);
      setLoadError(null);
      
      const loadTheme = async () => {
        try {
          let themeApplied = false;
          
          // Try to apply theme from user profile if logged in
          if (user && profile?.theme_settings) {
            try {
              // Parse and apply user theme
              const themeSettings = JSON.parse(profile.theme_settings);
              
              if (themeSettings) {
                // Apply theme colors based on current mode
                const currentTheme = theme === 'light' 
                  ? themeSettings.lightTheme 
                  : themeSettings.darkTheme;
                
                if (currentTheme) {
                  applyThemeChanges(currentTheme);
                  themeApplied = true;
                }
                
                // Apply background if it exists
                if (themeSettings.backgroundImage) {
                  const opacity = parseFloat(themeSettings.backgroundOpacity || '0.5');
                  applyBackgroundWithRetry(themeSettings.backgroundImage, opacity);
                } else {
                  applyBackgroundWithRetry(null, 0.5);
                }
              }
            } catch (e) {
              logger.error('Error parsing user theme settings', e, { module: 'theme' });
            }
          }
          
          // If no user theme was applied, use defaults
          if (!themeApplied) {
            try {
              // Fetch app settings (only once)
              const appSettings = await fetchAppSettings();
              
              if (appSettings && appSettings.default_theme_settings) {
                const defaultThemeSettings = JSON.parse(appSettings.default_theme_settings);
                
                if (defaultThemeSettings) {
                  // Apply theme colors based on current mode
                  const currentTheme = theme === 'light' 
                    ? defaultThemeSettings.lightTheme 
                    : defaultThemeSettings.darkTheme;
                  
                  if (currentTheme) {
                    applyThemeChanges(currentTheme);
                    themeApplied = true;
                  }
                  
                  // Apply background image if it exists
                  if (defaultThemeSettings.backgroundImage) {
                    const opacity = parseFloat(defaultThemeSettings.backgroundOpacity || '0.5');
                    applyBackgroundWithRetry(defaultThemeSettings.backgroundImage, opacity);
                  } else {
                    applyBackgroundWithRetry(null, 0.5);
                  }
                }
              }
            } catch (e) {
              logger.error('Error fetching app settings', e, { module: 'theme' });
            }
          }
          
          // Fallback to system defaults if nothing applied
          if (!themeApplied) {
            // System defaults are in theme.css
            logger.info('Using system default theme', { module: 'theme' });
            applyBackgroundWithRetry(null, 0.5);
          }
          
          // Mark theme as loaded, regardless of the outcome
          setIsThemeLoaded(true);
          
        } catch (e) {
          logger.error('Error processing theme settings', e, { module: 'theme' });
          setLoadError('Error processing theme settings');
          setIsThemeLoaded(true); // Still mark as loaded to prevent endless retries
        } finally {
          setIsThemeLoading(false);
          
          // Clear timeout since we're done
          if (themeLoadTimeoutRef.current) {
            clearTimeout(themeLoadTimeoutRef.current);
            themeLoadTimeoutRef.current = null;
          }
        }
      };
      
      loadTheme();
    }
    
    return () => {
      // Clear timeout on cleanup
      if (themeLoadTimeoutRef.current) {
        clearTimeout(themeLoadTimeoutRef.current);
        themeLoadTimeoutRef.current = null;
      }
    };
  }, [theme, user, profile, applyThemeMode, applyBackgroundWithRetry]);

  // Simplified reloadTheme function
  const reloadTheme = useCallback(() => {
    // Prevent excessive reloads
    loadAttemptRef.current++;
    if (loadAttemptRef.current > 3) {
      logger.warn('Too many theme reload attempts', { 
        module: 'theme', 
        attempts: loadAttemptRef.current 
      });
      return;
    }
    
    logger.info('Manual theme reload requested', { module: 'theme' });
    
    // Reset state to trigger reloading
    setIsThemeLoaded(false);
    setLoadError(null);
    
    // Reapply theme mode to trigger the main effect
    applyThemeMode(theme);
  }, [theme, applyThemeMode]);

  return { 
    theme, 
    setTheme, 
    isThemeLoaded,
    isThemeLoading,
    isBackgroundLoading,
    loadError,
    reloadTheme 
  };
}
