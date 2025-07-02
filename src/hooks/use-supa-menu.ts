import { useEffect, useState } from 'react';
import { supaMenu } from '@/services/supa-menu';
import { SupaMenuState } from '@/services/supa-menu/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/SupaThemeContext';

export const useSupaMenu = () => {
  const [state, setState] = useState<SupaMenuState>(supaMenu.getState());
  const { user } = useAuth();
  const { theme } = useTheme();

  // Initialize and sync with auth changes
  useEffect(() => {
    supaMenu.initialize(user?.id);
    
    const unsubscribe = supaMenu.subscribe(setState);
    return unsubscribe;
  }, [user?.id]);

  // Sync with theme changes
  useEffect(() => {
    supaMenu.setThemeMode(theme);
  }, [theme]);

  return {
    state,
    updateAdminMenuSettings: supaMenu.updateAdminMenuSettings.bind(supaMenu),
    resetToDefaults: supaMenu.resetToDefaults.bind(supaMenu),
  };
};