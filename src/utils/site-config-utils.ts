
import { logger } from '@/utils/logging';
import { fetchStaticSiteConfig } from '@/services/site-config/site-config-file-service';

export interface BuildInfo {
  version: string;
  buildDate: string;
  commitHash: string;
  environment: string;
}

/**
 * Extract build information from site-config.json
 */
export async function getBuildInfoFromSiteConfig(): Promise<BuildInfo> {
  try {
    const siteConfig = await fetchStaticSiteConfig();
    
    if (siteConfig) {
      // Calculate build date from lastUpdated or use current fallback
      let buildDate = 'Unknown';
      if (siteConfig.lastUpdated) {
        try {
          const date = new Date(siteConfig.lastUpdated);
          buildDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (dateError) {
          logger.warn('Failed to parse lastUpdated date', dateError, { module: 'site-config-utils' });
          buildDate = siteConfig.lastUpdated;
        }
      }
      
      return {
        version: siteConfig.version || '0.9.0-beta.1',
        buildDate,
        commitHash: siteConfig.commitHash || generatePseudoCommitHash(siteConfig),
        environment: siteConfig.environment || 'unknown'
      };
    }
  } catch (error) {
    logger.warn('Failed to fetch site config for build info', error, { module: 'site-config-utils' });
  }
  
  // Fallback to defaults with updated version
  return {
    version: '0.9.0-beta.1',
    buildDate: new Date().toLocaleDateString(),
    commitHash: 'dev-build',
    environment: import.meta.env.MODE || 'development'
  };
}

/**
 * Generate a pseudo commit hash from site config data
 */
function generatePseudoCommitHash(siteConfig: any): string {
  try {
    const configString = JSON.stringify({
      version: siteConfig.version,
      lastUpdated: siteConfig.lastUpdated,
      environment: siteConfig.environment
    });
    
    // Simple hash generation for pseudo commit hash
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16).substring(0, 8);
  } catch (error) {
    return 'unknown';
  }
}
