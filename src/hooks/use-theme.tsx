
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { emitDebugEvent } from '@/utils/debug-events';
import { logger } from '@/utils/logging';
import { applyThemeChanges, applyBackgroundImage } from '@/utils/theme-utils';

type Theme = 'dark' | 'light';

export function useTheme() {
  const { user, profile, updateProfile } = useAuth();
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

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
    
    if (user && profile) {
      try {
        // Get existing theme settings or create new ones
        let themeSettings = profile.theme_settings 
          ? JSON.parse(profile.theme_settings) 
          : { mode: theme };
        
        // Only update if there's a change to avoid unnecessary API calls
        const shouldUpdate = themeSettings.mode !== theme;
        
        if (shouldUpdate) {
          themeSettings.mode = theme;
          
          // Update theme settings in profile
          updateProfile({ theme_settings: JSON.stringify(themeSettings) })
            .catch(err => {
              emitDebugEvent({
                lastError: `Error updating theme`,
                lastAction: 'Theme update failed'
              });
              
              logger.error('Error updating theme settings', err, { module: 'theme' });
            });
        }
        
        // Apply theme colors and background settings regardless of mode change
        // Get the current theme colors
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
      } catch (e) {
        // Use emitDebugEvent and logger for errors
        emitDebugEvent({
          lastError: `Error processing theme settings`,
          lastAction: 'Theme parse failed'
        });
        
        logger.error('Error processing theme settings', e, { module: 'theme' });
        
        // Create new theme settings with minimal information
        const themeSettings = { mode: theme };
        updateProfile({ theme_settings: JSON.stringify(themeSettings) })
          .catch(err => {
            logger.error('Error creating theme settings', err, { module: 'theme' });
          });
      }
    }
  }, [theme, user, profile, updateProfile]);

  return { theme, setTheme };
}
