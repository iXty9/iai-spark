import { useEffect, useRef } from 'react';
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
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return; // Wait for auth to stabilize

    const currentUserId = user?.id ?? null;
    
    // Only reinitialize if user context actually changed
    if (lastUserIdRef.current === currentUserId) {
      return;
    }
    
    lastUserIdRef.current = currentUserId;
    
    // Reinitialize theme system with current user context
    const reinitializeTheme = async () => {
      try {
        logger.info('Reinitializing theme system for auth change', { 
          module: 'auth-theme-sync', 
          userId: currentUserId ? 'authenticated' : 'anonymous' 
        });
        
        await supaThemes.initialize(currentUserId || undefined);
        
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