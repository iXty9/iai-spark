
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { getAppSettingsMap } from './generalSettings';
import { ConnectionConfig } from './types';
import { updateAppSetting } from './generalSettings';

/**
 * Store connection configuration in the app_settings table
 * @param url Supabase URL
 * @param anonKey Supabase anonymous key
 * @param serviceKey Optional service role key
 * @returns Success status
 */
export async function saveConnectionConfig(
  url: string,
  anonKey: string,
  serviceKey?: string
): Promise<boolean> {
  try {
    // Create a batch of operations
    const operations = [
      updateAppSetting('supabase_url', url),
      updateAppSetting('supabase_anon_key', anonKey)
    ];
    
    // Add service key if provided
    if (serviceKey) {
      operations.push(updateAppSetting('supabase_service_key', serviceKey));
    }
    
    // Mark as initialized
    operations.push(updateAppSetting('supabase_initialized', 'true'));
    
    // Record timestamp
    operations.push(updateAppSetting('supabase_last_connection', new Date().toISOString()));
    
    // Wait for all operations to complete
    const results = await Promise.all(operations);
    
    // Check if any operation failed
    if (results.some(result => !result)) {
      logger.error('Some connection config operations failed', { module: 'settings' });
      return false;
    }
    
    logger.info('Connection configuration saved to database', { 
      module: 'settings',
      url: url.split('//')[1] // Log domain only for security
    });
    
    return true;
  } catch (error) {
    logger.error('Error saving connection configuration to database:', error);
    return false;
  }
}

/**
 * Fetch connection configuration from app_settings
 * @returns Connection configuration or null if not found
 */
export async function fetchConnectionConfig(): Promise<ConnectionConfig | null> {
  try {
    // Fetch all relevant connection settings
    const settingsMap = await getAppSettingsMap();
    
    const url = settingsMap['supabase_url'];
    const anonKey = settingsMap['supabase_anon_key'];
    const serviceKey = settingsMap['supabase_service_key'];
    const isInitialized = settingsMap['supabase_initialized'] === 'true';
    const lastConnection = settingsMap['supabase_last_connection'];
    
    // Check if required settings exist
    if (!url || !anonKey) {
      logger.info('Connection configuration not found in database', { module: 'settings' });
      return null;
    }
    
    logger.info('Retrieved connection configuration from database', { 
      module: 'settings',
      url: url.split('//')[1], // Log domain only for security
      lastConnection
    });
    
    return {
      url,
      anonKey,
      serviceKey,
      isInitialized,
      lastConnection
    };
  } catch (error) {
    logger.error('Error fetching connection configuration from database:', error);
    return null;
  }
}
