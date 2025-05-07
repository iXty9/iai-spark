
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { fetchConnectionConfig } from '@/services/admin/settingsService';
import { testBootstrapConnection } from './bootstrap-service';

/**
 * Configuration for server-side environment
 */
interface SiteConfigEnv {
  siteHost: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  lastUpdated: string;
}

/**
 * Save connection settings to app_settings for server-side environment
 * This creates/updates special settings that will be used for bootstrapping
 */
export async function saveSiteEnvironmentConfig(
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<boolean> {
  try {
    logger.info('Saving site environment configuration to database', {
      module: 'site-config'
    });
    
    const siteHost = window.location.hostname;
    const config: SiteConfigEnv = {
      siteHost,
      supabaseUrl,
      supabaseAnonKey,
      lastUpdated: new Date().toISOString()
    };
    
    // Convert to JSON string for storage
    const configString = JSON.stringify(config);
    
    // First check if the record already exists
    const { data: existingRecord, error: selectError } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'site_environment_config')
      .maybeSingle();
    
    if (selectError) {
      logger.error('Error checking for existing site environment config', selectError, {
        module: 'site-config'
      });
      return false;
    }
    
    let result;
    
    if (existingRecord) {
      // Update the existing record
      result = await supabase
        .from('app_settings')
        .update({ value: configString })
        .eq('key', 'site_environment_config');
    } else {
      // Insert a new record
      result = await supabase
        .from('app_settings')
        .insert({ key: 'site_environment_config', value: configString });
    }
    
    if (result.error) {
      logger.error('Failed to save site environment config', result.error, {
        module: 'site-config'
      });
      return false;
    }
    
    logger.info('Site environment configuration saved successfully', {
      module: 'site-config',
      host: siteHost
    });
    
    return true;
  } catch (error) {
    logger.error('Error in saveSiteEnvironmentConfig', error, {
      module: 'site-config'
    });
    return false;
  }
}

/**
 * Load site environment configuration from app_settings
 */
export async function loadSiteEnvironmentConfig(
  temporaryUrl: string,
  temporaryKey: string
): Promise<SiteConfigEnv | null> {
  try {
    // Create a temporary client to fetch the site config
    const tempClient = supabase || createTemporaryClient(temporaryUrl, temporaryKey);
    
    if (!tempClient) {
      logger.error('Cannot create client to load site environment config', null, {
        module: 'site-config'
      });
      return null;
    }
    
    // Try to retrieve from app_settings table
    const { data, error } = await tempClient
      .from('app_settings')
      .select('value')
      .eq('key', 'site_environment_config')
      .single();
    
    if (error || !data) {
      logger.info('No site environment config found', {
        module: 'site-config',
        error: error?.message
      });
      return null;
    }
    
    // Parse the config
    try {
      const config: SiteConfigEnv = JSON.parse(data.value);
      
      // Validate that the config contains required fields
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        logger.warn('Site environment config is incomplete', {
          module: 'site-config',
          config
        });
        return null;
      }
      
      // Validate that the config matches the current host
      if (config.siteHost && config.siteHost !== window.location.hostname) {
        logger.warn('Site environment config is for different host', {
          module: 'site-config',
          configHost: config.siteHost,
          currentHost: window.location.hostname
        });
        // Still return the config - it could be a different environment but still valid
      }
      
      logger.info('Loaded site environment config', {
        module: 'site-config',
        host: config.siteHost,
        lastUpdated: config.lastUpdated
      });
      
      return config;
    } catch (parseError) {
      logger.error('Error parsing site environment config', parseError, {
        module: 'site-config'
      });
      return null;
    }
  } catch (error) {
    logger.error('Error in loadSiteEnvironmentConfig', error, {
      module: 'site-config'
    });
    return null;
  }
}

/**
 * Create a temporary client for loading site config
 * This avoids circular dependencies
 */
function createTemporaryClient(url: string, key: string) {
  try {
    // Only import here to avoid circular dependencies
    const { createClient } = require('@supabase/supabase-js');
    
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  } catch (error) {
    logger.error('Error creating temporary client', error, {
      module: 'site-config'
    });
    return null;
  }
}

/**
 * Test if the site environment configuration is valid
 */
export async function testSiteEnvironmentConfig(): Promise<boolean> {
  try {
    // First try to load connection config from database
    const dbConfig = await fetchConnectionConfig();
    
    if (!dbConfig) {
      logger.info('No connection config found in database', {
        module: 'site-config'
      });
      return false;
    }
    
    // Test connection with retrieved config
    const isConnected = await testBootstrapConnection(
      dbConfig.url,
      dbConfig.anonKey
    );
    
    if (!isConnected) {
      logger.warn('Site environment config connection test failed', {
        module: 'site-config'
      });
      return false;
    }
    
    // Save the valid config to site environment
    const saved = await saveSiteEnvironmentConfig(
      dbConfig.url,
      dbConfig.anonKey
    );
    
    return saved;
  } catch (error) {
    logger.error('Error in testSiteEnvironmentConfig', error, {
      module: 'site-config'
    });
    return false;
  }
}
