
import { logger } from '@/utils/logging';
import { SiteConfigEnv } from '@/services/supabase/site-config-service';

/**
 * Path to the static site configuration file
 * This file will be accessible without authentication
 */
const SITE_CONFIG_FILE_PATH = '/site-config.json';

/**
 * Format for the static site configuration file
 */
interface StaticSiteConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  lastUpdated: string;
  siteHost: string;
}

/**
 * Fetch the static site configuration file
 * This is used to bootstrap the application without requiring localStorage or an existing connection
 */
export async function fetchStaticSiteConfig(): Promise<SiteConfigEnv | null> {
  try {
    const baseUrl = window.location.origin;
    const configUrl = `${baseUrl}${SITE_CONFIG_FILE_PATH}`;
    
    logger.info('Fetching static site configuration', {
      module: 'site-config',
      configUrl
    });
    
    // Attempt to fetch the config file
    const response = await fetch(configUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      logger.info('No static site configuration found', {
        module: 'site-config',
        status: response.status
      });
      return null;
    }
    
    const config: StaticSiteConfig = await response.json();
    
    // Validate that the config is complete
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      logger.warn('Incomplete static site configuration', {
        module: 'site-config',
        config
      });
      return null;
    }
    
    // Convert to the expected format
    return {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      siteHost: config.siteHost || window.location.hostname,
      lastUpdated: config.lastUpdated || new Date().toISOString()
    };
  } catch (error) {
    logger.info('Error fetching static site configuration', {
      module: 'site-config',
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Endpoint for updating the site configuration file
 * This would typically be called by an API or during build
 */
export async function updateStaticSiteConfig(config: SiteConfigEnv): Promise<boolean> {
  try {
    const staticConfig: StaticSiteConfig = {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      lastUpdated: new Date().toISOString(),
      siteHost: config.siteHost || window.location.hostname
    };
    
    logger.info('Attempting to update static site configuration', {
      module: 'site-config',
      host: staticConfig.siteHost
    });
    
    // For client-side updates, we'll use a simple POST request to a server endpoint
    // In a production environment, this would be a secure API endpoint
    const baseUrl = window.location.origin;
    const updateUrl = `${baseUrl}/api/update-site-config`;
    
    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(staticConfig)
    });
    
    if (!response.ok) {
      logger.error('Failed to update static site configuration', {
        module: 'site-config',
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }
    
    logger.info('Static site configuration updated successfully', {
      module: 'site-config'
    });
    
    return true;
  } catch (error) {
    logger.error('Error updating static site configuration', {
      module: 'site-config',
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Fallback function to write configuration to localStorage
 * This is used as a fallback when the API isn't available
 */
export function writeConfigToLocalStorage(config: SiteConfigEnv): boolean {
  try {
    const staticConfig: StaticSiteConfig = {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      lastUpdated: new Date().toISOString(),
      siteHost: config.siteHost || window.location.hostname
    };
    
    localStorage.setItem('site-config', JSON.stringify(staticConfig));
    
    logger.info('Static site configuration saved to localStorage', {
      module: 'site-config',
      host: staticConfig.siteHost
    });
    
    return true;
  } catch (error) {
    logger.error('Error saving static site configuration to localStorage', {
      module: 'site-config',
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}
