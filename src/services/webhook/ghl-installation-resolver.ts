import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

/**
 * Non-sensitive GHL installation info for webhook payloads
 */
export interface GhlInstallationInfo {
  location_id: string;
  location_name: string | null;
  company_id: string | null;
  company_name: string | null;
  connection_status: string;
}

/**
 * Fetches GHL installation info for a user if they have a connected installation.
 * Only returns non-sensitive metadata (no tokens or encrypted data).
 * Returns null if no installation or not connected.
 */
export async function getGhlInstallationInfo(userId: string): Promise<GhlInstallationInfo | null> {
  try {
    const { data, error } = await supabase
      .from('ghl_installations')
      .select('location_id, location_name, company_id, company_name, connection_status')
      .eq('user_id', userId)
      .eq('connection_status', 'connected')
      .maybeSingle();

    if (error) {
      logger.warn('[GHL Resolver] Error fetching installation', { error: error.message }, { module: 'webhook' });
      return null;
    }

    if (!data || !data.location_id) {
      return null;
    }

    return {
      location_id: data.location_id,
      location_name: data.location_name,
      company_id: data.company_id,
      company_name: data.company_name,
      connection_status: data.connection_status
    };
  } catch (err) {
    logger.error('[GHL Resolver] Unexpected error', err, { module: 'webhook' });
    return null;
  }
}
