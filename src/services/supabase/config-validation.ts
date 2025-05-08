/**
 * Configuration validation utilities
 * Provides schema validation for Supabase configurations
 */

import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';

/**
 * Validate a Supabase configuration
 * @param config The configuration to validate
 * @returns Validation result with errors if invalid
 */
export function validateConfig(config: unknown): { 
  valid: boolean; 
  config?: SupabaseConfig; 
  errors?: string[] 
} {
  try {
    if (!config) {
      return {
        valid: false,
        errors: ['Configuration is null or undefined']
      };
    }
    
    const errors: string[] = [];
    const typedConfig = config as Record<string, any>;
    
    // Check required fields
    if (!typedConfig.url) {
      errors.push('URL is required');
    } else if (!isValidUrl(typedConfig.url)) {
      errors.push('URL is invalid');
    }
    
    if (!typedConfig.anonKey) {
      errors.push('Anonymous key is required');
    } else if (typeof typedConfig.anonKey !== 'string' || typedConfig.anonKey.length < 10) {
      errors.push('Anonymous key is invalid');
    }
    
    // Check optional fields
    if (typedConfig.serviceKey !== undefined && 
        (typeof typedConfig.serviceKey !== 'string' || typedConfig.serviceKey.length < 10)) {
      errors.push('Service key is invalid');
    }
    
    if (typedConfig.isInitialized !== undefined && typeof typedConfig.isInitialized !== 'boolean') {
      errors.push('isInitialized must be a boolean');
    }
    
    if (typedConfig.savedAt !== undefined && !isValidISODate(typedConfig.savedAt)) {
      errors.push('savedAt must be a valid ISO date string');
    }
    
    // If there are errors, return them
    if (errors.length > 0) {
      return {
        valid: false,
        errors
      };
    }
    
    // All checks passed, return the validated config
    return {
      valid: true,
      config: {
        url: typedConfig.url,
        anonKey: typedConfig.anonKey,
        serviceKey: typedConfig.serviceKey,
        isInitialized: typedConfig.isInitialized ?? false,
        savedAt: typedConfig.savedAt || new Date().toISOString(),
        environment: typedConfig.environment
      }
    };
  } catch (error) {
    logger.error('Error validating configuration', error, {
      module: 'config-validation'
    });
    
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error']
    };
  }
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a string is a valid ISO date
 */
function isValidISODate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.toISOString() === dateString;
  } catch (e) {
    return false;
  }
}
