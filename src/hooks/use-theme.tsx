
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme(defaultTheme));
  const { user } = useAuth();

  // Update theme from user preferences
  useEffect(() => {
    if (!user) return;
    
    const fetchUserTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme_settings')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user theme:', error);
          return;
        }

        if (data?.theme_settings) {
          try {
            const themeSettings = JSON.parse(data.theme_settings);
            if (themeSettings.theme && isValidTheme(themeSettings.theme)) {
              setTheme(themeSettings.theme);
            }
          } catch (e) {
            console.error('Error parsing theme settings:', e);
          }
        }
      } catch (error) {
        console.error('Unexpected error fetching theme:', error);
      }
    };

    fetchUserTheme();
  }, [user]);

  // Save theme to user preferences when it changes
  useEffect(() => {
    if (!user) return;
    
    const saveUserTheme = async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            theme_settings: JSON.stringify({ theme }),
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error saving user theme:', error);
        }
      } catch (error) {
        console.error('Unexpected error saving theme:', error);
      }
    };

    saveUserTheme();
  }, [theme, user]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper functions
function getInitialTheme(defaultTheme: Theme): Theme {
  if (typeof window === 'undefined') return defaultTheme;
  
  const storedTheme = localStorage.getItem('theme') as Theme | null;
  if (storedTheme && isValidTheme(storedTheme)) {
    return storedTheme;
  }
  
  return defaultTheme;
}

function isValidTheme(theme: string): theme is Theme {
  return ['dark', 'light', 'system'].includes(theme);
}
