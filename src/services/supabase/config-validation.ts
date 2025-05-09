
/**
 * Configuration validation service
 * Ensures that Supabase configuration is valid before using it
 */

import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';

/**
 * Result of configuration validation
 */
interface ValidationResult {
  valid: boolean;
  config: SupabaseConfig | null;
  errors?: string[];
}

/**
 * Validate Supabase configuration
 * Ensures that required fields are present and have non-empty values
 */
export function validateConfig(config: any): ValidationResult {
  try {
    if (!config) {
      return {
        valid: false,
        config: null,
        errors: ['Configuration is null or undefined']
      };
    }
    
    const errors: string[] = [];
    
    // Check required fields
    if (!config.url) {
      errors.push('Supabase URL is required');
    } else if (typeof config.url !== 'string') {
      errors.push('Supabase URL must be a string');
    } else if (!config.url.trim()) {
      errors.push('Supabase URL cannot be empty');
    }
    
    if (!config.anonKey) {
      errors.push('Supabase anonymous key is required');
    } else if (typeof config.anonKey !== 'string') {
      errors.push('Supabase anonymous key must be a string');
    } else if (!config.anonKey.trim()) {
      errors.push('Supabase anonymous key cannot be empty');
    }
    
    // If there are errors, return invalid result
    if (errors.length > 0) {
      logger.warn('Configuration validation failed', {
        module: 'config-validation',
        errors
      });
      
      return {
        valid: false,
        config: null,
        errors
      };
    }
    
    // Ensure all string values are trimmed
    const validatedConfig: SupabaseConfig = {
      ...config,
      url: config.url.trim(),
      anonKey: config.anonKey.trim(),
      serviceKey: config.serviceKey ? config.serviceKey.trim() : undefined
    };
    
    return {
      valid: true,
      config: validatedConfig
    };
  } catch (error) {
    logger.error('Error validating configuration', error, {
      module: 'config-validation'
    });
    
    return {
      valid: false,
      config: null,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    // Check if URL is empty or just whitespace
    if (!url || !url.trim()) {
      return false;
    }
    
    // Ensure URL starts with http:// or https://
    if (!url.trim().startsWith('http://') && !url.trim().startsWith('https://')) {
      return false;
    }
    
    // Try to parse URL
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Attempt to repair a malformed URL
 */
export function attemptUrlFormatRepair(url: string): string | null {
  if (!url || !url.trim()) return null;
  
  // Remove common typos
  let fixedUrl = url.trim();
  
  // Fix missing or incorrect protocol
  if (fixedUrl.startsWith('ahttp')) {
    fixedUrl = fixedUrl.replace('ahttp', 'http');
  }
  
  if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
    fixedUrl = 'https://' + fixedUrl;
  }
  
  // Validate the fixed URL
  try {
    new URL(fixedUrl);
    return fixedUrl;
  } catch (e) {
    return null;
  }
}
