
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';
import { configState, ConfigStatus } from '@/services/config/config-state-manager';

// Simple singleton holder for Supabase client
let supabaseInstance: SupabaseClient | null = null;

/**
 * Simplified connection service using unified config state
 */

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{
  isConnected: boolean;
  error?: string;
  errorCode?: string;
}> {
  if (!url?.trim() || !anonKey?.trim()) {
    return {
      isConnected: false,
      error: 'Empty credentials provided',
      errorCode: 'EMPTY_CREDENTIALS'
    };
  }

  try {
    const testClient = createClient(url.trim(), anonKey.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // Simple connection test
    const { error } = await testClient.from('app_settings').select('count(*)', { count: 'exact' });
    
    if (error) {
      return {
        isConnected: false,
        error: error.message,
        errorCode: error.code
      };
    }

    return { isConnected: true };
    
  } catch (error: any) {
    return {
      isConnected: false,
      error: error?.message || String(error),
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  try {
    // Get configuration from state manager
    const state = configState.getState();
    
    if (state.status !== ConfigStatus.READY || !state.config?.url || !state.config?.anonKey) {
      logger.warn('No valid config for Supabase client', { 
        module: 'simplified-connection',
        status: state.status
      });
      return null;
    }

    // Create new client
    supabaseInstance = createClient(state.config.url, state.config.anonKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
        debug: process.env.NODE_ENV === 'development'
      }
    });

    logger.info('Supabase client created', { 
      module: 'simplified-connection',
      url: state.config.url.split('//')[1], // Log domain only for security
      source: state.source
    });

    return supabaseInstance;
    
  } catch (error) {
    logger.error('Failed to create Supabase client', error, { module: 'simplified-connection' });
    return null;
  }
}

export function resetSupabaseClient(): void {
  supabaseInstance = null;
  logger.info('Supabase client reset', { module: 'simplified-connection' });
}

export function shouldBypassRedirect(pathname: string): boolean {
  const bypassRoutes = ['/initialize', '/auth/error', '/api/', '/debug'];
  return bypassRoutes.some(route => pathname.startsWith(route));
}
