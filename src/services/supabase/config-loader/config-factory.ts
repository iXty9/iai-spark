
import { SupabaseConfig } from '@/config/supabase/types';
import { getEnvironmentId } from '@/config/supabase/environment';

/**
 * Factory for creating SupabaseConfig objects
 */
export function createConfig(url: string, anonKey: string, serviceKey?: string, isInitialized = true): SupabaseConfig {
  return {
    url: url.trim(),
    anonKey: anonKey.trim(),
    ...(serviceKey ? { serviceKey: serviceKey.trim() } : {}),
    isInitialized,
    savedAt: new Date().toISOString(),
    environment: getEnvironmentId()
  };
}

/**
 * Validation utilities for config loading
 */
export function isEmptyValue(value?: string): boolean {
  return !value || !value.trim();
}

export function validateRequiredFields(config: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (isEmptyValue(config?.[field])) {
      return `Config contains empty or invalid value: ${field}`;
    }
  }
  return null;
}
