
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Theme = 'dark' | 'light';

export function useTheme() {
  const { user, profile, updateProfile } = useAuth();
  const [theme, setTheme] = useState<Theme>(
    () => {
      // Try to get theme from localStorage first
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
        return savedTheme;
      }
      
      // If no saved theme, check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
  );

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
    
    // If user is logged in and has a profile, update theme setting
    if (user && profile && profile.theme_settings) {
      try {
        const themeSettings = JSON.parse(profile.theme_settings);
        if (themeSettings.mode !== theme) {
          themeSettings.mode = theme;
          updateProfile({ theme_settings: JSON.stringify(themeSettings) })
            .catch(err => console.error('Error updating theme in profile:', err));
        }
      } catch (e) {
        console.error('Error parsing theme settings from profile:', e);
        // Create new theme settings object
        const themeSettings = { mode: theme };
        updateProfile({ theme_settings: JSON.stringify(themeSettings) })
          .catch(err => console.error('Error creating theme settings in profile:', err));
      }
    }
  }, [theme, user, profile]);

  return { theme, setTheme };
}
