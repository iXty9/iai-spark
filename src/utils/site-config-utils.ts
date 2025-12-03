
import { logger } from '@/utils/logging';
import { fetchStaticSiteConfig } from '@/services/site-config/site-config-file-service';

export interface BuildInfo {
  version: string;
  buildDate: string;
  commitHash: string;
  environment: string;
}

/**
 * Format build date from ISO string
 */
function formatBuildDate(isoString: string | undefined): string {
  if (!isoString) return 'Unknown';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch {
    return isoString;
  }
}

/**
 * Extract build information - prioritizes version.json (generated at build time)
 * Falls back to site-config.json if version.json is unavailable
 */
export async function getBuildInfoFromSiteConfig(): Promise<BuildInfo> {
  // First, try version.json (generated at build time - most accurate source of truth)
  try {
    const versionResponse = await fetch('/version.json', { cache: 'no-store' });
    if (versionResponse.ok) {
      const versionData = await versionResponse.json();
      return {
        version: versionData.version || '1.0.0',
        buildDate: formatBuildDate(versionData.buildTime),
        commitHash: versionData.buildHash || 'unknown',
        environment: versionData.environment || 'unknown'
      };
    }
  } catch (error) {
    logger.warn('Failed to fetch version.json, falling back to site-config', error, { module: 'site-config-utils' });
  }

  // Fallback to site-config.json
  try {
    const siteConfig = await fetchStaticSiteConfig();
    
    if (siteConfig) {
      return {
        version: siteConfig.version || '1.0.0',
        buildDate: formatBuildDate(siteConfig.lastUpdated),
        commitHash: siteConfig.commitHash || siteConfig.buildHash || generatePseudoCommitHash(siteConfig),
        environment: siteConfig.environment || 'unknown'
      };
    }
  } catch (error) {
    logger.warn('Failed to fetch site config for build info', error, { module: 'site-config-utils' });
  }
  
  // Final fallback
  return {
    version: '1.0.0',
    buildDate: 'Unknown',
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
    
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16).substring(0, 8);
  } catch {
    return 'unknown';
  }
}
