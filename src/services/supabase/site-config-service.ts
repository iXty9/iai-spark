
import { logger } from '@/utils/logging';
import { withSupabase } from '@/utils/supabase-helpers';

export interface SiteConfigEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteHost?: string;
  lastUpdated?: string;
  [key: string]: any;
}

// Load site environment configuration from the database
export async function loadSiteEnvironmentConfig(url: string, anonKey: string): Promise<SiteConfigEnv | null> {
  try {
    const client = await withSupabase(async (supabase) => {
      // Try to connect with provided credentials
      return supabase;
    });
    
    if (!client) {
      logger.error('Could not get Supabase client when loading site environment config', null, { module: 'site-config' });
      return null;
    }
    
    const { data, error } = await client
      .from('app_settings')
      .select('value')
      .eq('key', 'site_environment')
      .single();
      
    if (error) {
      logger.error('Error loading site environment config', error, { module: 'site-config' });
      return null;
    }
    
    if (data && data.value) {
      try {
        const config = JSON.parse(data.value);
        return config;
      } catch (e) {
        logger.error('Error parsing site environment config JSON', e, { module: 'site-config' });
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Unexpected error loading site environment config', error, { module: 'site-config' });
    return null;
  }
}

// Save site environment configuration to the database
export async function saveSiteEnvironmentConfig(url: string, anonKey: string): Promise<boolean> {
  try {
    const client = await withSupabase(async (supabase) => supabase);
    
    if (!client) {
      logger.error('Could not get Supabase client when saving site environment config', null, { module: 'site-config' });
      return false;
    }
    
    const config: SiteConfigEnv = {
      supabaseUrl: url,
      supabaseAnonKey: anonKey,
      siteHost: window.location.hostname,
      lastUpdated: new Date().toISOString()
    };
    
    // Check if a site environment config already exists
    const { data: existingConfig } = await client
      .from('app_settings')
      .select('id')
      .eq('key', 'site_environment')
      .single();
    
    let result;
    if (existingConfig) {
      // Update the existing config
      result = await client
        .from('app_settings')
        .update({ value: JSON.stringify(config) })
        .eq('id', existingConfig.id);
    } else {
      // Insert a new config
      result = await client
        .from('app_settings')
        .insert({ key: 'site_environment', value: JSON.stringify(config) });
    }
    
    if (result.error) {
      logger.error('Error saving site environment config', result.error, { module: 'site-config' });
      return false;
    }
    
    logger.info('Site environment config saved successfully', { module: 'site-config' });
    return true;
  } catch (error) {
    logger.error('Unexpected error saving site environment config', error, { module: 'site-config' });
    return false;
  }
}

// Reset site environment configuration
export async function resetSiteEnvironmentConfig(): Promise<boolean> {
  try {
    const client = await withSupabase(async (supabase) => supabase);
    
    if (!client) {
      logger.error('Could not get Supabase client when resetting site environment config', null, { module: 'site-config' });
      return false;
    }
    
    const { error } = await client
      .from('app_settings')
      .delete()
      .eq('key', 'site_environment');
      
    if (error) {
      logger.error('Error resetting site environment config', error, { module: 'site-config' });
      return false;
    }
    
    logger.info('Site environment config reset successfully', { module: 'site-config' });
    return true;
  } catch (error) {
    logger.error('Unexpected error resetting site environment config', error, { module: 'site-config' });
    return false;
  }
}

// Update all site configurations - used to ensure consistency
export async function updateAllSiteConfigurations(url: string, anonKey: string): Promise<boolean> {
  try {
    // Save to site environment config in the database
    const dbSaved = await saveSiteEnvironmentConfig(url, anonKey);
    
    // Additional sync with other configurations could go here
    
    return dbSaved;
  } catch (error) {
    logger.error('Error updating all site configurations', error, { module: 'site-config' });
    return false;
  }
}
