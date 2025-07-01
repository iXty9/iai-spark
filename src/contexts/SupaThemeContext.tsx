import { createContext, useContext, ReactNode } from 'react';
import { useSupaThemes } from '@/hooks/use-supa-themes';

// Create a simple context that provides the SupaThemes hook
const SupaThemeContext = createContext<ReturnType<typeof useSupaThemes> | undefined>(undefined);

interface SupaThemeProviderProps {
  children: ReactNode;
}

export const SupaThemeProvider = ({ children }: SupaThemeProviderProps) => {
  const supaThemes = useSupaThemes();
  
  return (
    <SupaThemeContext.Provider value={supaThemes}>
      {children}
    </SupaThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(SupaThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a SupaThemeProvider');
  }
  return context;
};