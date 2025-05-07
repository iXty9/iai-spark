
import { logger } from '@/utils/logging';

// Storage key for Supabase configuration - now with environment-specific keys
const BASE_STORAGE_KEY = 'spark_supabase_config';
const ENV_KEY = 'spark_supabase_env';

/**
 * Generate a unique but consistent environment ID
 */
export function getEnvironmentId(): string {
  const hostname = window.location.hostname;
  
  // Special case for localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  }
  
  // For staging/preview environments (lovable.app domains)
  if (hostname.includes('lovable.app')) {
    return 'preview';
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
 * Environment detection - more precise detection
 */
export const isDevelopment = () => {
  const hostname = window.location.hostname;
  
  // For debugging environment detection
  localStorage.setItem(ENV_KEY, hostname);
  
  // Log the hostname for debugging only once
  logger.info(`Running environment detection for hostname: ${hostname}`, {
    module: 'supabase-config',
    once: true
  });

  // Direct check for localhost and 127.0.0.1 which are definitely development
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
    logger.info(`Hostname ${hostname} is a local development environment`, {
      module: 'supabase-config',
      once: true
    });
    return true;
  }

  // Everything else is considered production
  logger.info(`Hostname ${hostname} is considered a production environment`, {
    module: 'supabase-config',
    once: true
  });
  return false;
};

/**
 * Get environment-specific storage key to support multiple environments
 */
export function getConfigStorageKey() {
  const env = getEnvironmentId();
  return `${BASE_STORAGE_KEY}_${env}`;
}
