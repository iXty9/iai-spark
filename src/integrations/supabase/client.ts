
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { connectionService } from '@/services/config/connection-service';
import { logger } from '@/utils/logging';

// Create a default client that will be replaced when properly initialized
let supabase = createClient<Database>(
  'https://ymtdtzkskjdqlzhjuesk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltdGR0emtza2pkcWx6aGp1ZXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MjUyNDYsImV4cCI6MjA2MDUwMTI0Nn0.sOQdxH63edhcIgjx6mxjHkeam4IQGViaWYLdFDepIaE'
);

/**
 * Get the current Supabase client
 * Will use the connection service client if available, otherwise falls back to default
 */
export function getSupabaseClient() {
  const serviceClient = connectionService.getClient();
  
  if (serviceClient) {
    return serviceClient;
  }
  
  logger.warn('Using default Supabase client - connection service not initialized', {
    module: 'supabase-client'
  });
  
  return supabase;
}

// Export the client getter as the default export
export { getSupabaseClient as supabase };

// Also export as named export for backward compatibility
export const supabaseClient = getSupabaseClient;

/**
 * Initialize the Supabase client with new configuration
 * This will be called by the connection service
 */
export function updateSupabaseClient(url: string, anonKey: string) {
  supabase = createClient<Database>(url, anonKey);
  logger.info('Supabase client updated with new configuration', {
    module: 'supabase-client'
  });
}
