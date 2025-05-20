
// This file provides a centralized client export for integrations

import { getSupabaseClient, isClientReady, isTabVisible } from '@/services/supabase/client-provider';
import { logger } from '@/utils/logging';

// Export the client getter function
export const supabase = (async function() {
  try {
    // Try to get the client
    const client = await getSupabaseClient();
    
    // Return the client or null
    return client;
  } catch (error) {
    logger.error('Error getting Supabase client', error, { module: 'supabase-client' });
    return null;
  }
})();

// Add safety check functions
export function isClientAvailable(): boolean {
  return isClientReady();
}

// Export tab visibility tracker
export function isTabActive(): boolean {
  return isTabVisible();
}
