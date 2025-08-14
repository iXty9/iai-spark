import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supaThemes } from '@/services/supa-themes/core';
import { smartUpdateService } from '@/services/pwa/smartUpdateService';
import { logger } from '@/utils/logging';

/**
 * Hook to synchronize theme system with authentication changes
 * Reinitializes theme system when user authentication status changes
 */
export const useAuthThemeSync = () => {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return; // Wait for auth to stabilize

    const userId = user?.id || null;
    
    // Reinitialize theme system with current user context
    const reinitializeTheme = async () => {
      try {
        logger.info('Reinitializing theme system for auth change', { 
          module: 'auth-theme-sync', 
          userId: userId ? 'authenticated' : 'anonymous' 
        });
        
        await supaThemes.initialize(userId || undefined);
        
        // Initialize smart updates after theme is ready
        await smartUpdateService.initialize();
      } catch (error) {
        logger.error('Failed to reinitialize theme system and smart updates:', error, { 
          module: 'auth-theme-sync' 
        });
      }
    };

    reinitializeTheme();
  }, [user?.id, isLoading]);
};