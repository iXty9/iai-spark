
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

/**
 * Helper function to safely access Supabase client
 * This function provides proper error handling for the Promise-based client
 */
export async function withSupabase(callback: (client: any) => Promise<any>) {
  try {
    const client = await supabase;
    if (!client) {
      throw new Error('Supabase client not available');
    }
    
    return await callback(client);
  } catch (error) {
    logger.error('Error executing Supabase operation', error);
    throw error;
  }
}
