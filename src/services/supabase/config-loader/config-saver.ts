
import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';
import { validateConfig } from '../config-validation';
import {
  writeConfigToLocalStorage,
  convertSupabaseConfigToSiteConfig
} from '@/services/site-config/site-config-file-service';
import { getEnvironmentId } from '@/config/supabase/environment';

/**
 * Save configuration with validation and fallback storage
 */
export function saveConfiguration(config: SupabaseConfig): boolean {
  try {
    if (!config) {
      logger.warn('Cannot save null config', { module: 'config-loader' });
      return false;
    }
    
    const validation = validateConfig(config);
    if (!validation.valid) {
      logger.warn('Cannot save invalid config', { 
        errors: validation.errors, 
        module: 'config-loader' 
      });
      return false;
    }
    
    const siteConfig = convertSupabaseConfigToSiteConfig(config);
    if (!writeConfigToLocalStorage(siteConfig)) {
      // Fallback storage method
      try {
        const storageKey = getEnvironmentId();
        localStorage.setItem(`spark_supabase_config_${storageKey}`, JSON.stringify(config));
        logger.info('Config saved using fallback method', { module: 'config-loader' });
        return true;
      } catch (fallbackError) {
        logger.error('Fallback config save failed', fallbackError, { module: 'config-loader' });
        return false;
      }
    }
    
    logger.info('Configuration saved successfully', { module: 'config-loader' });
    return true;
    
  } catch (error) {
    logger.error('Failed to save configuration', error, { module: 'config-loader' });
    return false;
  }
}
