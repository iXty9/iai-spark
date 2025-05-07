
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

interface AppSettings {
  app_name?: string;
  site_title?: string;
  default_theme_settings?: string;
  [key: string]: string | undefined;
}

export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    // Properly await the response to avoid type errors
    const result = await supabase
      .from('app_settings')
      .select('key, value');
      
    // Handle errors
    if (result.error) {
      logger.error('Error fetching app settings:', result.error);
      return {};
    }
    
    // Transform into an object
    const settings: AppSettings = {};
    if (result.data) {
      result.data.forEach(row => {
        settings[row.key] = row.value;
      });
    }
    
    return settings;
  } catch (error) {
    logger.error('Unexpected error in fetchAppSettings:', error);
    return {};
  }
}

export async function updateAppSetting(key: string, value: string): Promise<boolean> {
  try {
    // Check if setting exists with proper awaiting
    const existingResult = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key);
      
    if (existingResult.error) {
      logger.error(`Error checking if setting ${key} exists:`, existingResult.error);
      return false;
    }
    
    let result;
    
    if (existingResult.data && existingResult.data.length > 0) {
      // Update existing setting
      result = await supabase
        .from('app_settings')
        .update({ value })
        .eq('key', key);
    } else {
      // Insert new setting
      result = await supabase
        .from('app_settings')
        .insert({ key, value });
    }
    
    if (result.error) {
      logger.error(`Error updating setting ${key}:`, result.error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Unexpected error updating setting ${key}:`, error);
    return false;
  }
}

/**
 * Get all app settings as a key-value map
 */
export async function getAppSettingsMap(): Promise<Record<string, string>> {
  try {
    // Properly await the response to avoid type errors
    const result = await supabase
      .from('app_settings')
      .select('key, value');
      
    if (result.error) {
      logger.error('Error fetching app settings map:', result.error);
      return {};
    }
    
    const settingsMap: Record<string, string> = {};
    if (result.data) {
      result.data.forEach(row => {
        settingsMap[row.key] = row.value;
      });
    }
    
    return settingsMap;
  } catch (error) {
    logger.error('Unexpected error in getAppSettingsMap:', error);
    return {};
  }
}

// New functions for connection configuration

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
export async function fetchConnectionConfig(): Promise<{
  url: string;
  anonKey: string;
  serviceKey?: string;
  isInitialized: boolean;
  lastConnection?: string;
} | null> {
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
