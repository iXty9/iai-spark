
import { logger } from '../logging';
import { globalStateService } from '@/services/debug/global-state-service';

/**
 * Authentication debugging utilities
 */

/**
 * Track authentication state changes for debugging
 */
export function trackAuthStateChange(isAuthenticated: boolean, userId?: string | null) {
  if (typeof window === 'undefined') return;
  
  const authStatus = isAuthenticated ? 'authenticated' : 'unauthenticated';
  const authInfo = {
    authStatus,
    userId: userId || null,
    lastAuthChange: new Date().toISOString()
  };
  
  globalStateService.updateNestedState('supabaseInfo', authInfo);
  
  window.dispatchEvent(new CustomEvent('chatDebug', { 
    detail: { supabaseInfo: authInfo }
  }));
  
  logger.info(`Auth state changed: ${authStatus}${userId ? ` (User: ${userId})` : ''}`, null, { module: 'auth' });
}
