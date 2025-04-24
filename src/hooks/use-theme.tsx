
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
    
    if (user && profile && profile.theme_settings) {
      try {
        const themeSettings = JSON.parse(profile.theme_settings);
        if (themeSettings.mode !== theme) {
          themeSettings.mode = theme;
          const currentTheme = theme === 'light' ? themeSettings.lightTheme : themeSettings.darkTheme;
          
          // Update CSS variables with theme colors
          root.style.setProperty('--background-color', currentTheme.backgroundColor);
          root.style.setProperty('--primary-color', currentTheme.primaryColor);
          root.style.setProperty('--text-color', currentTheme.textColor);
          root.style.setProperty('--accent-color', currentTheme.accentColor);
          root.style.setProperty('--user-bubble-color', currentTheme.userBubbleColor || currentTheme.primaryColor);
          root.style.setProperty('--ai-bubble-color', currentTheme.aiBubbleColor || currentTheme.accentColor);
          
          // Update theme settings in profile
          updateProfile({ theme_settings: JSON.stringify(themeSettings) })
            .catch(err => console.error('Error updating theme in profile:', err));
        }
      } catch (e) {
        console.error('Error parsing theme settings from profile:', e);
        const themeSettings = { mode: theme };
        updateProfile({ theme_settings: JSON.stringify(themeSettings) })
          .catch(err => console.error('Error creating theme settings in profile:', err));
      }
    }
  }, [theme, user, profile]);

  return { theme, setTheme };
}
