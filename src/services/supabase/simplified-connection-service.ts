
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getStoredConfig } from '@/config/supabase-config';
import { logger } from '@/utils/logging';

// Simple singleton holder for Supabase client
let supabaseInstance: SupabaseClient | null = null;

/**
 * Simplified connection service - no complex caching, monitoring, or fallbacks
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
    // Get configuration
    const config = getStoredConfig();
    
    if (!config?.url || !config?.anonKey) {
      logger.warn('No valid config for Supabase client', { module: 'simplified-connection' });
      return null;
    }

    // Create new client
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
        debug: process.env.NODE_ENV === 'development'
      }
    });

    logger.info('Supabase client created', { 
      module: 'simplified-connection',
      url: config.url.split('//')[1] // Log domain only for security
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
