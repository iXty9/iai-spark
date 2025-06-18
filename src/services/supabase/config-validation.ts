
/**
 * Configuration validation service
 * Now uses consolidated utilities to avoid duplication
 */

import { logger } from '@/utils/logging';
import { SupabaseConfig } from '@/config/supabase/types';
import { 
  validateSupabaseConfig,
  isValidSupabaseUrl,
  attemptUrlRepair
} from '@/config/supabase/utils';

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
 * Uses consolidated validation logic
 */
export function validateConfig(config: any): ValidationResult {
  return validateSupabaseConfig(config);
}

/**
 * Check if a URL is valid
 * Uses consolidated URL validation
 */
export function isValidUrl(url: string): boolean {
  return isValidSupabaseUrl(url);
}

/**
 * Attempt to repair a malformed URL
 * Uses consolidated URL repair logic
 */
export function attemptUrlFormatRepair(url: string): string | null {
  return attemptUrlRepair(url);
}
