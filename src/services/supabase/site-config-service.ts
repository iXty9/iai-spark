import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { fetchConnectionConfig } from '@/services/admin/settingsService';
import { testBootstrapConnection } from './bootstrap-service';
import { fetchStaticSiteConfig, updateStaticSiteConfig } from '@/services/site-config/site-config-file-service';
import { createClient } from '@supabase/supabase-js';

export interface SiteConfigEnv {
  siteHost: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  lastUpdated: string;
}

const getConfig = (supabaseUrl: string, supabaseAnonKey: string): SiteConfigEnv => ({
  siteHost: window.location.hostname,
  supabaseUrl,
  supabaseAnonKey,
  lastUpdated: new Date().toISOString()
});

export async function updateAllSiteConfigurations(
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<boolean> {
  try {
    logger.info('Updating all site configuration sources', { module: 'site-config' });
    const config = getConfig(supabaseUrl, supabaseAnonKey);
    const [dbUpdate, fileUpdate] = await Promise.all([
      saveSiteEnvironmentConfig(supabaseUrl, supabaseAnonKey),
      updateStaticSiteConfig(config)
    ]);
    return dbUpdate || fileUpdate;
  } catch (error) {
    logger.error('Error updating all site configurations', error, { module: 'site-config' });
    return false;
  }
}

export async function saveSiteEnvironmentConfig(
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<boolean> {
  try {
    logger.info('Saving site environment configuration to database', { module: 'site-config' });
    const configString = JSON.stringify(getConfig(supabaseUrl, supabaseAnonKey));
    const { data: existingRecord, error } = await supabase
      .from('app_settings')
      .select('*').eq('key', 'site_environment_config').maybeSingle();

    if (error) {
      logger.error('Error checking for existing site environment config', error, { module: 'site-config' });
      return false;
    }

    const result = existingRecord ?
      await supabase.from('app_settings').update({ value: configString }).eq('key', 'site_environment_config') :
      await supabase.from('app_settings').insert({ key: 'site_environment_config', value: configString });

    if (result.error) {
      logger.error('Failed to save site environment config', result.error, { module: 'site-config' });
      return false;
    }

    logger.info('Site environment configuration saved successfully', {
      module: 'site-config', host: window.location.hostname
    });
    return true;
  } catch (error) {
    logger.error('Error in saveSiteEnvironmentConfig', error, { module: 'site-config' });
    return false;
  }
}

export async function loadSiteEnvironmentConfig(
  temporaryUrl: string,
  temporaryKey: string
): Promise<SiteConfigEnv | null> {
  try {
    const staticConfig = await fetchStaticSiteConfig();
    if (
      staticConfig && staticConfig.supabaseUrl?.trim() && staticConfig.supabaseAnonKey?.trim()
    ) {
      logger.info('Loaded site environment config from static file', {
        module: 'site-config', host: staticConfig.siteHost, lastUpdated: staticConfig.lastUpdated
      });
      return staticConfig;
    }
    if (staticConfig) {
      logger.warn('Static site config has empty values', {
        module: 'site-config', hasUrl: !!staticConfig.supabaseUrl, hasKey: !!staticConfig.supabaseAnonKey
      });
      return null;
    }
    const tempClient = supabase || createTemporaryClient(temporaryUrl, temporaryKey);
    if (!tempClient) {
      logger.error('Cannot create client to load site environment config', null, { module: 'site-config' });
      return null;
    }
    const { data, error } = await tempClient
      .from('app_settings')
      .select('value').eq('key', 'site_environment_config').single();
    if (error || !data) {
      logger.info('No site environment config found in database', {
        module: 'site-config',
        error: error?.message
      });
      return null;
    }
    try {
      const config: SiteConfigEnv = JSON.parse(data.value);
      if (!config.supabaseUrl?.trim() || !config.supabaseAnonKey?.trim()) {
        logger.warn('Site environment config is incomplete or has empty values', {
          module: 'site-config', hasUrl: !!config.supabaseUrl, hasKey: !!config.supabaseAnonKey
        });
        return null;
      }
      if (config.siteHost && config.siteHost !== window.location.hostname) {
        logger.warn('Site environment config is for different host', {
          module: 'site-config',
          configHost: config.siteHost,
          currentHost: window.location.hostname
        });
      }
      logger.info('Loaded site environment config from database', {
        module: 'site-config', host: config.siteHost, lastUpdated: config.lastUpdated
      });
      return config;
    } catch (parseError) {
      logger.error('Error parsing site environment config', parseError, { module: 'site-config' });
      return null;
    }
  } catch (error) {
    logger.error('Error in loadSiteEnvironmentConfig', error, { module: 'site-config' });
    return null;
  }
}

function createTemporaryClient(url: string, key: string) {
  try {
    if (!url || !key) {
      logger.warn('Cannot create temporary client with empty credentials', {
        module: 'site-config',
        hasUrl: !!url,
        hasKey: !!key
      });
      return null;
    }
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } catch (error) {
    logger.error('Error creating temporary client', error, { module: 'site-config' });
    return null;
  }
}

export async function testSiteEnvironmentConfig(): Promise<boolean> {
  try {
    const dbConfig = await fetchConnectionConfig();
    if (!dbConfig) {
      logger.info('No connection config found in database', { module: 'site-config' });
      return false;
    }
    const isConnected = await testBootstrapConnection(dbConfig.url, dbConfig.anonKey);
    if (!isConnected) {
      logger.warn('Site environment config connection test failed', { module: 'site-config' });
      return false;
    }
    return await updateAllSiteConfigurations(dbConfig.url, dbConfig.anonKey);
  } catch (error) {
    logger.error('Error in testSiteEnvironmentConfig', error, { module: 'site-config' });
    return false;
  }
}