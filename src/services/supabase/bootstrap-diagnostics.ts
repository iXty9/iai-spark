/**
 * Bootstrap diagnostics service
 * Provides tools to diagnose and troubleshoot bootstrap issues
 */

import { logger } from '@/utils/logging';
import { getConnectionInfo } from './connection-service';
import { BootstrapContext, BootstrapState, initBootstrapContext } from './bootstrap-state-machine';
import { testBootstrapConnection } from './bootstrap-service';
import { validateConfig } from './config-validation';
import { getStoredConfig } from '@/config/supabase-config';

/**
 * Result of diagnostic tests
 */
export interface DiagnosticResult {
  timestamp: string;
  connectionInfo: ReturnType<typeof getConnectionInfo>;
  bootstrapContext: BootstrapContext;
  networkConnectivity: boolean;
  databaseConnectivity: boolean;
  localStorageAvailable: boolean;
  configurationValid: boolean;
  recommendations: string[];
}

/**
 * Run comprehensive diagnostics on the bootstrap process
 */
export async function runBootstrapDiagnostics(): Promise<DiagnosticResult> {
  logger.info('Running bootstrap diagnostics', {
    module: 'bootstrap-diagnostics'
  });
  
  const connectionInfo = getConnectionInfo();
  const bootstrapContext = getBootstrapContext();
  const recommendations: string[] = [];
  
  // Check network connectivity
  const networkConnectivity = await checkNetworkConnectivity();
  if (!networkConnectivity) {
    recommendations.push('Check your internet connection');
  }
  
  // Check database connectivity
  let databaseConnectivity = false;
  if (connectionInfo.hasStoredConfig) {
    const storedConfig = getStoredConfig();
    if (storedConfig?.url && storedConfig?.anonKey) {
      const connectionTest = await testBootstrapConnection(
        storedConfig.url, 
        storedConfig.anonKey
      );
      
      databaseConnectivity = connectionTest.isConnected;
      
      if (!databaseConnectivity) {
        recommendations.push(`Verify your Supabase credentials: ${connectionTest.error}`);
      } else if (!connectionTest.hasPermissions) {
        recommendations.push(`Your connection works but has permission issues: ${connectionTest.error}`);
      }
    }
  } else {
    recommendations.push('No stored configuration found. Complete the setup process');
  }
  
  // Check localStorage
  const localStorageAvailable = checkLocalStorageAvailable();
  if (!localStorageAvailable) {
    recommendations.push('Enable localStorage in your browser');
  }
  
  // Check configuration validity
  const configurationValid = validateStoredConfiguration();
  if (!configurationValid) {
    recommendations.push('Your configuration appears to be invalid. Try resetting it');
  }
  
  // Add bootstrap state-specific recommendations
  if (bootstrapContext.state === BootstrapState.CONNECTION_ERROR) {
    recommendations.push(`Connection error: ${bootstrapContext.error}. Try resetting your configuration.`);
  } else if (bootstrapContext.state === BootstrapState.CONFIG_MISSING) {
    recommendations.push('No configuration found. Complete the setup process.');
  }
  
  return {
    timestamp: new Date().toISOString(),
    connectionInfo,
    bootstrapContext,
    networkConnectivity,
    databaseConnectivity,
    localStorageAvailable,
    configurationValid,
    recommendations
  };
}

/**
 * Get the bootstrap context
 * This is a wrapper to handle cases where the context might not be available
 */
import { initBootstrapContext } from './bootstrap-state-machine';

export function getBootstrapContext(): BootstrapContext {
  try {
    return initBootstrapContext();
  } catch (e) {
    logger.error('Error getting bootstrap context', e, {
      module: 'bootstrap-diagnostics'
    });
    
    return {
      state: BootstrapState.INITIAL,
      retryCount: 0,
      lastAttempt: '',
      environment: 'unknown',
      error: 'Error retrieving bootstrap context'
    };
  }
}

/**
 * Check if we have internet connectivity
 */
async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a reliable external resource
    const response = await fetch('https://www.google.com', { 
      mode: 'no-cors',
      cache: 'no-cache'
    });
    return true;
  } catch (error) {
    logger.warn('Network connectivity test failed', error, {
      module: 'bootstrap-diagnostics'
    });
    return false;
  }
}

/**
 * Check if localStorage is available
 */
function checkLocalStorageAvailable(): boolean {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return true;
  } catch (e) {
    logger.warn('localStorage test failed', e, {
      module: 'bootstrap-diagnostics'
    });
    return false;
  }
}

/**
 * Validate the stored configuration
 */
function validateStoredConfiguration(): boolean {
  try {
    const storedConfig = getStoredConfig();
    if (!storedConfig) {
      return false;
    }
    
    const validation = validateConfig(storedConfig);
    return validation.valid;
  } catch (e) {
    logger.error('Error validating stored configuration', e, {
      module: 'bootstrap-diagnostics'
    });
    return false;
  }
}

/**
 * Generate a diagnostic report for troubleshooting
 */
export async function generateDiagnosticReport(): Promise<string> {
  try {
    const diagnostics = await runBootstrapDiagnostics();
    
    // Format the report as JSON
    return JSON.stringify(diagnostics, null, 2);
  } catch (e) {
    logger.error('Error generating diagnostic report', e, {
      module: 'bootstrap-diagnostics'
    });
    
    return JSON.stringify({
      error: 'Failed to generate diagnostic report',
      timestamp: new Date().toISOString()
    }, null, 2);
  }
}
