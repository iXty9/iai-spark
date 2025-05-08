
import { logger } from '@/utils/logging';

// Storage key for Supabase configuration - now with environment-specific keys
const BASE_STORAGE_KEY = 'spark_supabase_config';
const ENV_KEY = 'spark_supabase_env';
const ENV_OVERRIDE_KEY = 'spark_environment_override';

// Environment types for more specific handling
export enum EnvironmentType {
  LOCAL = 'local',
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PREVIEW = 'preview',
  PRODUCTION = 'production',
  CUSTOM = 'custom'
}

/**
 * Generate a unique but consistent environment ID with improved detection
 */
export function getEnvironmentId(): string {
  // Check for explicit environment override
  const envOverride = localStorage.getItem(ENV_OVERRIDE_KEY);
  if (envOverride) {
    logger.info(`Using environment override: ${envOverride}`, {
      module: 'environment',
      once: true
    });
    return envOverride;
  }
  
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  const search = window.location.search;
  
  // Check for environment signals in URL path or search params
  if (pathname.includes('/preview/') || search.includes('preview=true')) {
    const previewId = getPathHash(pathname);
    return `preview_${previewId}`;
  }
  
  if (pathname.includes('/staging/') || search.includes('env=staging')) {
    return 'staging';
  }
  
  if (pathname.includes('/dev/') || search.includes('env=dev')) {
    return 'development';
  }
  
  // Special case for localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  }
  
  // For staging/preview environments (lovable.app domains)
  if (hostname.includes('lovable.app')) {
    return 'preview';
  }
  
  // For development environments
  if (hostname.includes('dev.') || hostname.includes('.dev.') || hostname.endsWith('.local')) {
    return 'development';
  }
  
  // For staging environments
  if (hostname.includes('staging.') || hostname.includes('.staging.')) {
    return 'staging';
  }
  
  // For other environments, use a hash of the hostname
  // This ensures each domain gets its own config, but remains consistent
  let hash = 0;
  for (let i = 0; i < hostname.length; i++) {
    hash = ((hash << 5) - hash) + hostname.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return `env_${Math.abs(hash).toString(16)}`;
}

/**
 * Get a hash of a path for unique environment IDs
 */
function getPathHash(path: string): string {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = ((hash << 5) - hash) + path.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Set an environment override
 * This allows for testing different environments without changing the URL
 */
export function setEnvironmentOverride(envId: string): void {
  localStorage.setItem(ENV_OVERRIDE_KEY, envId);
  logger.info(`Set environment override to: ${envId}`, {
    module: 'environment'
  });
}

/**
 * Clear environment override
 */
export function clearEnvironmentOverride(): void {
  localStorage.removeItem(ENV_OVERRIDE_KEY);
  logger.info('Cleared environment override', {
    module: 'environment'
  });
}

/**
 * Get the environment type based on the current environment ID
 */
export function getEnvironmentType(): EnvironmentType {
  const envId = getEnvironmentId();
  
  if (envId === 'local') {
    return EnvironmentType.LOCAL;
  }
  
  if (envId.startsWith('development') || envId.startsWith('dev_')) {
    return EnvironmentType.DEVELOPMENT;
  }
  
  if (envId.startsWith('staging') || envId.startsWith('stage_')) {
    return EnvironmentType.STAGING;
  }
  
  if (envId.startsWith('preview')) {
    return EnvironmentType.PREVIEW;
  }
  
  if (envId.startsWith('prod_') || envId.startsWith('env_')) {
    return EnvironmentType.PRODUCTION;
  }
  
  return EnvironmentType.CUSTOM;
}

/**
 * Environment detection - more precise detection
 */
export const isDevelopment = () => {
  const envType = getEnvironmentType();
  const hostname = window.location.hostname;
  
  // For debugging environment detection
  localStorage.setItem(ENV_KEY, hostname);
  
  // Log the hostname for debugging only once
  logger.info(`Running environment detection for hostname: ${hostname}`, {
    module: 'environment',
    once: true
  });

  // Check environment type
  const isDev = envType === EnvironmentType.LOCAL || 
                envType === EnvironmentType.DEVELOPMENT || 
                envType === EnvironmentType.PREVIEW;
  
  logger.info(`Environment ${hostname} is detected as ${isDev ? 'development' : 'production'}`, {
    module: 'environment',
    once: true,
    envType
  });
  
  return isDev;
};

/**
 * Get environment-specific storage key to support multiple environments
 */
export function getConfigStorageKey() {
  const env = getEnvironmentId();
  return `${BASE_STORAGE_KEY}_${env}`;
}

/**
 * Get detailed environment information for debugging
 */
export function getEnvironmentInfo() {
  return {
    id: getEnvironmentId(),
    type: getEnvironmentType(),
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    isDevelopment: isDevelopment(),
    hasOverride: !!localStorage.getItem(ENV_OVERRIDE_KEY)
  };
}
