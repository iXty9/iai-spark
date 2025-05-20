
// This file provides a centralized client export for integrations

import { getSupabaseClient, isClientReady } from '@/services/supabase/client-provider';
import { isTabVisible } from '@/utils/visibility-tracker'; // Import from visibility-tracker
import { logger } from '@/utils/logging';

// Export the client getter function - properly awaited to make it synchronous
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
