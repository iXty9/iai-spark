
import { getStoredConfig, saveConfig } from '@/config/supabase-config';
import { logger } from '@/utils/logging';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient, resetSupabaseClient } from './connection-service';

/**
 * Load site environment config from Supabase
 */
export async function loadSiteEnvironmentConfig(defaultUrl?: string, defaultKey?: string): Promise<any> {
  try {
    // Get current config or use provided defaults
    const config = getStoredConfig();
    const url = defaultUrl || config?.url;
    const key = defaultKey || config?.anonKey;
    
    if (!url || !key) {
      logger.warn('No valid URL or key for loading site environment', { module: 'site-config' });
      return null;
    }
    
    // Create a temporary client just for this operation
    const tempClient = createClient(url, key);
    
    // Try to fetch site environment configuration
    const { data, error } = await tempClient
      .from('app_settings')
      .select()
      .eq('key', 'site_environment')
      .single();
      
    if (error) {
      if (error.code !== 'PGRST116') { // Not found is not an error
        logger.error('Error loading site environment config', error, { module: 'site-config' });
      }
      return null;
    }
    
    if (!data || !data.value) {
      logger.warn('No site environment config found', { module: 'site-config' });
      return null;
    }
    
    // Try to parse the config
    try {
      const parsedConfig = JSON.parse(data.value);
      logger.info('Loaded site environment config', { module: 'site-config' });
      return parsedConfig;
    } catch (parseError) {
      logger.error('Error parsing site environment config', parseError, { module: 'site-config' });
      return null;
    }
  } catch (e) {
    logger.error('Unexpected error loading site environment config', e, { module: 'site-config' });
    return null;
  }
}

/**
 * Create or update the site environment configuration
 */
export async function updateSiteEnvironmentConfig(config: any): Promise<boolean> {
  try {
    if (!config || typeof config !== 'object') {
      logger.error('Invalid config for updateSiteEnvironmentConfig', { 
        module: 'site-config',
        configType: typeof config 
      });
      return false;
    }
    
    // Add a timestamp
    const configWithTimestamp = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    
    const client = await getSupabaseClient();
    
    // Convert config to string
    const configString = JSON.stringify(configWithTimestamp);
    
    // Check if key exists
    const { data: existingData } = await client
      .from('app_settings')
      .select()
      .eq('key', 'site_environment')
      .single();
      
    if (existingData) {
      // Update existing record
      const { error } = await client
        .from('app_settings')
        .update({ value: configString })
        .eq('key', 'site_environment');
        
      if (error) {
        logger.error('Error updating site environment config', error, { module: 'site-config' });
        return false;
      }
    } else {
      // Insert new record
      const { error } = await client
        .from('app_settings')
        .insert([{ key: 'site_environment', value: configString }]);
        
      if (error) {
        logger.error('Error inserting site environment config', error, { module: 'site-config' });
        return false;
      }
    }
    
    logger.info('Site environment config updated successfully', { module: 'site-config' });
    return true;
  } catch (e) {
    logger.error('Unexpected error updating site environment', e, { module: 'site-config' });
    return false;
  }
}

/**
 * Generate site configuration string for download
 */
export function generateSiteConfigString(url: string, anonKey: string): string {
  // Create a config object
  const config = {
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
    createdAt: new Date().toISOString()
  };
  
  // Convert to JSON string with formatting
  return JSON.stringify(config, null, 2);
}

/**
 * Reset site environment configuration
 */
export async function resetSiteEnvironmentConfig(): Promise<boolean> {
  try {
    const client = await getSupabaseClient();
    
    // Delete the site environment record
    const { error } = await client
      .from('app_settings')
      .delete()
      .eq('key', 'site_environment');
      
    if (error) {
      logger.error('Error resetting site environment config', error, { module: 'site-config' });
      return false;
    }
    
    // Reset the client
    resetSupabaseClient();
    
    logger.info('Site environment config reset successfully', { module: 'site-config' });
    return true;
  } catch (e) {
    logger.error('Unexpected error resetting site environment', e, { module: 'site-config' });
    return false;
  }
}
