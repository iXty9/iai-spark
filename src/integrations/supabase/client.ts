
// This file provides a centralized client export for integrations

import { getSupabaseClient, isClientReady } from '@/services/supabase/client-provider';
import { isTabVisible } from '@/utils/visibility-tracker'; // Import from visibility-tracker
import { logger } from '@/utils/logging';

// Create and export a singleton instance
let resolvedClient: any = null;

// Export the client getter function with proper await handling
export const supabase = (async function() {
  // Return cached instance if available
  if (resolvedClient) {
    return resolvedClient;
  }

  try {
    // Try to get the client
    resolvedClient = await getSupabaseClient();
    
    // Return the client or null
    return resolvedClient;
  } catch (error) {
    logger.error('Error getting Supabase client', error, { module: 'supabase-client' });
    return null;
  }
})();

// Add a helper function to get the client synchronously if already resolved
export function getResolvedClient() {
  return resolvedClient;
}

// Add safety check functions
export function isClientAvailable(): boolean {
  return isClientReady();
}

// Export tab visibility tracker
export function isTabActive(): boolean {
  return isTabVisible();
}
