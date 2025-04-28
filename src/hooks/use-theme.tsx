
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { emitDebugEvent } from '@/utils/debug-events';

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
          
          // Get the current theme colors
          const currentTheme = theme === 'light' 
            ? themeSettings.lightTheme 
            : themeSettings.darkTheme;
          
          // Only apply CSS variables if theme colors exist
          if (currentTheme) {
            // Update CSS variables with theme colors
            root.style.setProperty('--background-color', currentTheme.backgroundColor);
            root.style.setProperty('--primary-color', currentTheme.primaryColor);
            root.style.setProperty('--text-color', currentTheme.textColor);
            root.style.setProperty('--accent-color', currentTheme.accentColor);
            root.style.setProperty('--user-bubble-color', currentTheme.userBubbleColor || currentTheme.primaryColor);
            root.style.setProperty('--ai-bubble-color', currentTheme.aiBubbleColor || currentTheme.accentColor);
          }
          
          // Update theme settings in profile - use a try/catch to handle errors
          updateProfile({ theme_settings: JSON.stringify(themeSettings) })
            .catch(err => {
              // Log error but don't spam console
              emitDebugEvent({
                lastError: `Error updating theme: ${err.message}`,
                lastAction: 'Theme update failed'
              });
            });
        }
      } catch (e) {
        // Handle parsing error but avoid console spam
        emitDebugEvent({
          lastError: `Error processing theme settings: ${e instanceof Error ? e.message : String(e)}`,
          lastAction: 'Theme parse failed'
        });
        
        // Create new theme settings with minimal information
        const themeSettings = { mode: theme };
        updateProfile({ theme_settings: JSON.stringify(themeSettings) })
          .catch(err => {
            emitDebugEvent({
              lastError: `Error creating theme settings: ${err.message}`,
              lastAction: 'Theme creation failed'
            });
          });
      }
    }
  }, [theme, user, profile, updateProfile]);

  return { theme, setTheme };
}
