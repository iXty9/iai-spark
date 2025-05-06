
import { logger } from '@/utils/logging';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isInitialized: boolean;
}

// Storage key for Supabase configuration
const STORAGE_KEY = 'spark_supabase_config';

/**
 * Check if Supabase configuration exists in local storage
 */
export function hasStoredConfig(): boolean {
  try {
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    return !!storedConfig;
  } catch (e) {
    logger.error('Error checking for stored Supabase config', e);
    return false;
  }
}

/**
 * Get Supabase configuration from local storage
 */
export function getStoredConfig(): SupabaseConfig | null {
  try {
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    if (!storedConfig) return null;
    
    return JSON.parse(storedConfig) as SupabaseConfig;
  } catch (e) {
    logger.error('Error retrieving Supabase config from storage', e);
    return null;
  }
}

/**
 * Save Supabase configuration to local storage
 */
export function saveConfig(config: SupabaseConfig): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    logger.error('Error saving Supabase config to storage', e);
    return false;
  }
}

/**
 * Clear stored Supabase configuration
 */
export function clearConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    logger.error('Error clearing Supabase config', e);
  }
}

/**
 * Get hardcoded default Supabase configuration for development
 * This is used as a fallback when no configuration is available
 */
export function getDefaultConfig(): SupabaseConfig {
  return {
    url: "https://ymtdtzkskjdqlzhjuesk.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltdGR0emtza2pkcWx6aGp1ZXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MjUyNDYsImV4cCI6MjA2MDUwMTI0Nn0.sOQdxH63edhcIgjx6mxjHkeam4IQGViaWYLdFDepIaE",
    isInitialized: true
  };
}
