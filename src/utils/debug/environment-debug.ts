
import { logger } from '../logging';
import { globalStateService } from '@/services/debug/global-state-service';

/**
 * Environment information collection utilities
 */

// Function to collect and emit environment information
export function collectEnvironmentInfo() {
  if (typeof window === 'undefined') return;
  
  const publicVars: Record<string, string> = {};
  
  // Safely collect public environment variables using import.meta.env
  try {
    const env = import.meta.env;
    Object.keys(env).forEach(key => {
      if (key.startsWith('VITE_')) {
        const value = env[key] as string;
        // Sanitize sensitive values
        publicVars[key] = key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') ? 
          `${value?.substring(0, 3)}...${value?.substring(value.length - 3)}` : 
          value;
      }
    });
  } catch (error) {
    logger.warn('Failed to collect environment variables', error, { module: 'environment' });
  }
  
  // Determine environment type from multiple sources
  let storedEnv = localStorage.getItem('supabase_environment_local');
  
  if (storedEnv && storedEnv.startsWith('{') && storedEnv.endsWith('}')) {
    try {
      const envObj = JSON.parse(storedEnv);
      storedEnv = envObj.id || envObj.type || null;
    } catch (e) {
      logger.warn('Failed to parse environment string', e, { module: 'environment' });
      storedEnv = null;
    }
  }
  
  const hostnameEnv = window.location.hostname === 'localhost' ? 'development' : 
                      window.location.hostname.includes('staging') ? 'staging' :
                      window.location.hostname.includes('dev') ? 'development' :
                      window.location.hostname.includes('test') ? 'testing' :
                      'production';
  
  // Safe way to check NODE_ENV in Vite
  const processEnv = import.meta.env.MODE || null;
  
  const envType = storedEnv || hostnameEnv || processEnv || 'unknown';
  const isDevelopment = envType === 'development' || window.location.hostname === 'localhost';
  const isProduction = envType === 'production' && window.location.hostname !== 'localhost';
  
  // Store the determined environment for future reference
  try {
    localStorage.setItem('supabase_environment_local', envType);
  } catch (e) {
    logger.warn('Failed to store environment type', e, { module: 'environment' });
  }
  
  const buildInfo = {
    version: import.meta.env.VITE_APP_VERSION || 'unknown',
    buildDate: import.meta.env.VITE_BUILD_DATE || 'unknown',
    commitHash: import.meta.env.VITE_COMMIT_HASH || 'unknown'
  };
  
  const environmentInfo = {
    type: envType,
    isDevelopment,
    isProduction,
    publicVars,
    buildInfo,
    hasOverride: storedEnv !== null && storedEnv !== envType
  };
  
  // Dispatch the environment information event
  window.dispatchEvent(new CustomEvent('chatDebug', { 
    detail: { environmentInfo }
  }));
  
  globalStateService.updateNestedState('environmentInfo', environmentInfo);
  
  logger.info(`Environment: ${envType} (isDev: ${isDevelopment}, isProd: ${isProduction})`, null, { module: 'environment' });
}
