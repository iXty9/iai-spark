
import { logger } from '@/utils/logging';

// Define the SiteConfigEnv interface here to avoid circular imports
export interface SiteConfigEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteHost?: string;
  lastUpdated?: string;
  [key: string]: any;
}

// Check if we have a valid configuration
export function hasValidConfiguration(): boolean {
  try {
    // Implementation would go here
    // This is just a stub to satisfy imports
    return true;
  } catch (error) {
    logger.error('Error checking configuration', error);
    return false;
  }
}

/**
 * Generates a site-config.json file for download
 */
export async function generateConfigFile(
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<boolean> {
  try {
    const config: SiteConfigEnv = {
      supabaseUrl,
      supabaseAnonKey,
      siteHost: window.location.hostname,
      lastUpdated: new Date().toISOString()
    };
    
    // Convert the config to a pretty-printed JSON string
    const configJson = JSON.stringify(config, null, 2);
    
    // Create a Blob containing the JSON
    const blob = new Blob([configJson], { type: 'application/json' });
    
    // Create a download link for the blob
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'site-config.json';
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    logger.info('Site config file generated and downloaded', { module: 'config-generator' });
    return true;
  } catch (error) {
    logger.error('Error generating site config file', error, { module: 'config-generator' });
    return false;
  }
}
