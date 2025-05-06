
import { createClient } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { getStoredConfig, getDefaultConfig, hasStoredConfig } from '@/config/supabase-config';
import { logger } from '@/utils/logging';

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Get the Supabase client instance, creating it if needed
 */
export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;
  
  try {
    // Check for force_init parameter - don't initialize client if forcing init
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    
    if (forceInit) {
      logger.info('Force init parameter detected, not initializing Supabase client', {
        module: 'supabase'
      });
      return null;
    }
    
    // Get config from storage or use default
    const config = hasStoredConfig() ? getStoredConfig() : getDefaultConfig();
    
    if (!config) {
      throw new Error('No Supabase configuration available');
    }
    
    // Create and initialize the Supabase client
    supabaseInstance = createClient<Database>(config.url, config.anonKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
    
    logger.info('Supabase client initialized successfully', { 
      module: 'supabase',
      custom: true
    });
    
    return supabaseInstance;
  } catch (error) {
    logger.error('Failed to initialize Supabase client', error);
    toast({
      title: 'Connection Error',
      description: 'Could not connect to database. Please check configuration.',
      variant: 'destructive'
    });
    
    // Return null instead of potentially invalid instance
    return null;
  }
}

/**
 * Test a Supabase connection with the given URL and key
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<boolean> {
  try {
    const testClient = createClient(url, anonKey);
    
    // Try to make a simple query to test the connection
    const { error } = await testClient
      .from('profiles')
      .select('id')
      .limit(1);
    
    // If we got a 404, the table might not exist but the connection is fine
    if (error && error.code !== '42P01') {
      logger.error('Failed to test Supabase connection', error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error testing Supabase connection', error);
    return false;
  }
}

/**
 * Reset the Supabase client instance
 * This is useful when the configuration changes
 */
export function resetSupabaseClient() {
  logger.info('Resetting Supabase client instance', {
    module: 'supabase'
  });
  
  supabaseInstance = null;
}
