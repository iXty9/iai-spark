
import { logger } from '../logging';
import { globalStateService } from '@/services/debug/global-state-service';

/**
 * Environment information collection utilities
 */

// Function to collect and emit environment information
export function collectEnvironmentInfo() {
  if (typeof window === 'undefined') return;
  
  const publicVars: Record<string, string> = {};
  
  // Safely collect public environment variables
  if (typeof process !== 'undefined' && process.env) {
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('NEXT_PUBLIC_') || key.startsWith('REACT_APP_')) {
        const value = process.env[key] as string;
        // Sanitize sensitive values
        publicVars[key] = key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') ? 
          `${value?.substring(0, 3)}...${value?.substring(value.length - 3)}` : 
          value;
      }
    });
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
  const processEnv = typeof process !== 'undefined' ? process.env.NODE_ENV : null;
  
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
    version: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_VERSION ? 
      process.env.NEXT_PUBLIC_APP_VERSION : 'unknown',
    buildDate: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BUILD_DATE ? 
      process.env.NEXT_PUBLIC_BUILD_DATE : 'unknown',
    commitHash: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_COMMIT_HASH ? 
      process.env.NEXT_PUBLIC_COMMIT_HASH : 'unknown'
  };
  
  const environmentInfo = {
    type: envType,
    isDevelopment,
    isProduction,
    publicVars,
    buildInfo
  };
  
  // Dispatch the environment information event
  window.dispatchEvent(new CustomEvent('chatDebug', { 
    detail: { environmentInfo }
  }));
  
  globalStateService.updateNestedState('environmentInfo', environmentInfo);
  
  logger.info(`Environment: ${envType} (isDev: ${isDevelopment}, isProd: ${isProduction})`, null, { module: 'environment' });
}
