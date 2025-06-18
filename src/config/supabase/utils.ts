
/**
 * Unified configuration utilities
 * Consolidates duplicate validation and utility functions
 */

import { logger } from '@/utils/logging';
import { SupabaseConfig } from './types';

/**
 * Comprehensive configuration validation
 * Consolidates validation logic from multiple files
 */
export function validateSupabaseConfig(config: any): {
  valid: boolean;
  config: SupabaseConfig | null;
  errors?: string[];
} {
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
    } else {
      // Validate URL format
      try {
        new URL(config.url.trim());
      } catch (e) {
        errors.push('Supabase URL format is invalid');
      }
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
        module: 'config-utils',
        errors
      });
      
      return {
        valid: false,
        config: null,
        errors
      };
    }
    
    // Create validated config with trimmed values
    const validatedConfig: SupabaseConfig = {
      ...config,
      url: config.url.trim(),
      anonKey: config.anonKey.trim(),
      serviceKey: config.serviceKey ? config.serviceKey.trim() : undefined,
      isInitialized: true
    };
    
    return {
      valid: true,
      config: validatedConfig
    };
  } catch (error) {
    logger.error('Error validating configuration', error, {
      module: 'config-utils'
    });
    
    return {
      valid: false,
      config: null,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Safely get configuration URL, never returning hardcoded values
 * Consolidates URL safety logic
 */
export function getSafeConfigUrl(config: SupabaseConfig | null): string | null {
  return config?.url || null;
}

/**
 * Safely get configuration anon key, never returning hardcoded values
 * Consolidates key safety logic
 */
export function getSafeConfigAnonKey(config: SupabaseConfig | null): string | null {
  return config?.anonKey || null;
}

/**
 * Check if a URL is valid Supabase URL
 * Consolidates URL validation logic
 */
export function isValidSupabaseUrl(url: string): boolean {
  try {
    if (!url || !url.trim()) {
      return false;
    }
    
    // Ensure URL starts with http:// or https://
    if (!url.trim().startsWith('http://') && !url.trim().startsWith('https://')) {
      return false;
    }
    
    // Try to parse URL
    const parsedUrl = new URL(url.trim());
    
    // Basic Supabase URL validation - should contain supabase.co or be localhost
    return parsedUrl.hostname.includes('supabase.co') || 
           parsedUrl.hostname === 'localhost' || 
           parsedUrl.hostname === '127.0.0.1';
  } catch (e) {
    return false;
  }
}

/**
 * Attempt to repair a malformed URL
 * Consolidates URL repair logic
 */
export function attemptUrlRepair(url: string): string | null {
  if (!url || !url.trim()) return null;
  
  // Remove common typos and fix missing protocol
  let fixedUrl = url.trim();
  
  if (fixedUrl.startsWith('ahttp')) {
    fixedUrl = fixedUrl.replace('ahttp', 'http');
  }
  
  if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
    fixedUrl = 'https://' + fixedUrl;
  }
  
  // Validate the fixed URL
  return isValidSupabaseUrl(fixedUrl) ? fixedUrl : null;
}
