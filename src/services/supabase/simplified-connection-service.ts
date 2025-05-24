
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';
import { clientManager } from './client-manager';

/**
 * Simplified connection service using the new client manager
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
    const { error } = await testClient.from('app_settings').select('count', { count: 'exact' });
    
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

export function getSupabaseClient(): SupabaseClient | null {
  return clientManager.getClient();
}

export function resetSupabaseClient(): void {
  clientManager.destroy();
  logger.info('Supabase client reset via simplified service', { module: 'simplified-connection' });
}

export function shouldBypassRedirect(pathname: string): boolean {
  const bypassRoutes = ['/initialize', '/auth/error', '/api/', '/debug'];
  return bypassRoutes.some(route => pathname.startsWith(route));
}
