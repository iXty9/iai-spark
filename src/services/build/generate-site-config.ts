
import fs from 'fs';
import path from 'path';
import { logger } from '@/utils/logging';
import { SiteConfigEnv } from '@/services/supabase/site-config-service';

/**
 * Generate a site configuration file for static hosting
 * This would typically be run during the build process or via an API endpoint
 */
export async function generateSiteConfig(config: SiteConfigEnv, outputPath = 'public/site-config.json'): Promise<boolean> {
  try {
    // Create a sanitized version of the config for storage
    const sanitizedConfig = {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      siteHost: config.siteHost,
      lastUpdated: config.lastUpdated || new Date().toISOString()
    };
    
    // Convert to JSON
    const configJson = JSON.stringify(sanitizedConfig, null, 2);
    
    // Ensure the directory exists
    const directory = path.dirname(outputPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(outputPath, configJson);
    
    logger.info(`Site configuration file generated at ${outputPath}`, {
      module: 'build-service'
    });
    
    return true;
  } catch (error) {
    logger.error('Error generating site configuration file', error, {
      module: 'build-service'
    });
    return false;
  }
}

/**
 * This function would be used in a server-side environment
 * or in a build script to generate the site-config.json file
 */
export async function generateSiteConfigFromEnvironment(): Promise<boolean> {
  // In a real server environment, these would come from environment variables
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  const siteHost = process.env.SITE_HOST || 'unknown';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    logger.error('Missing required environment variables for site config generation', null, {
      module: 'build-service'
    });
    return false;
  }
  
  return generateSiteConfig({
    supabaseUrl,
    supabaseAnonKey,
    siteHost,
    lastUpdated: new Date().toISOString()
  });
}
