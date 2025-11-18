/**
 * Bootstrap Settings Loader
 * 
 * Loads PUBLIC application-level settings during app bootstrap BEFORE the main Supabase client is initialized.
 * Uses an ephemeral Supabase client and sessionStorage to ensure fresh data on every browser tab.
 * 
 * This prevents stale cached data and ensures the app always loads with current branding/customization.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';

const BOOTSTRAP_SETTINGS_KEY = 'bootstrap_app_settings';

// Keys that are accessible at the PUBLIC level (before authentication)
const PUBLIC_SETTINGS_KEYS = [
  'site_title',
  'tagline',
  'default_theme_settings',
  'ai_agent_name',
  'default_avatar_url',
  'auth_tagline',
  'auth_tagline_icon',
  'auth_welcome_description',
  'auth_login_title',
  'auth_login_description',
  'auth_register_title',
  'auth_register_description',
  'auth_disclaimer_text',
  'auth_disclaimer_required',
  'show_ai_in_menu'
] as const;

/**
 * Load PUBLIC settings during bootstrap using an ephemeral client
 * Stores in sessionStorage (clears on tab close) to ensure fresh data on refresh
 */
export async function loadBootstrapSettings(supabaseUrl: string, supabaseAnonKey: string): Promise<Record<string, string>> {
  try {
    logger.info('Loading PUBLIC bootstrap settings', { module: 'bootstrap-settings' });

    // Create ephemeral client just for this fetch
    const ephemeralClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Don't persist any session data
        autoRefreshToken: false
      }
    });

    // Fetch PUBLIC settings (accessible without authentication)
    const { data, error } = await ephemeralClient
      .from('app_settings')
      .select('key, value')
      .in('key', PUBLIC_SETTINGS_KEYS as unknown as string[]);

    if (error) {
      logger.error('Failed to load bootstrap settings', error, { module: 'bootstrap-settings' });
      return {};
    }

    // Transform to key-value map
    const settings: Record<string, string> = {};
    data?.forEach(row => {
      settings[row.key] = row.value;
    });

    // Store in sessionStorage (NOT localStorage) to ensure fresh data on tab reload
    try {
      sessionStorage.setItem(BOOTSTRAP_SETTINGS_KEY, JSON.stringify(settings));
    } catch (storageError) {
      logger.warn('Failed to store bootstrap settings in sessionStorage', { module: 'bootstrap-settings' });
    }

    logger.info('Bootstrap settings loaded successfully', { 
      count: Object.keys(settings).length,
      keys: Object.keys(settings)
    }, { module: 'bootstrap-settings' });

    return settings;

  } catch (error) {
    logger.error('Error loading bootstrap settings', error, { module: 'bootstrap-settings' });
    return {};
  }
}

/**
 * Get bootstrap settings from sessionStorage
 */
export function getBootstrapSettings(): Record<string, string> {
  try {
    const stored = sessionStorage.getItem(BOOTSTRAP_SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    logger.warn('Failed to retrieve bootstrap settings from sessionStorage', { module: 'bootstrap-settings' });
    return {};
  }
}

/**
 * Apply site title from bootstrap settings
 */
export function applyBootstrapSiteTitle(): void {
  try {
    if (typeof document === 'undefined') {
      return; // Only run in browser
    }

    const settings = getBootstrapSettings();
    if (settings.site_title) {
      document.title = settings.site_title;
      logger.debug(`Applied bootstrap site title: ${settings.site_title}`, null, { module: 'bootstrap-settings' });
    }
  } catch (error) {
    logger.warn('Failed to apply bootstrap site title', { module: 'bootstrap-settings' });
  }
}

/**
 * Clear bootstrap settings (useful for testing/debugging)
 */
export function clearBootstrapSettings(): void {
  try {
    sessionStorage.removeItem(BOOTSTRAP_SETTINGS_KEY);
    logger.debug('Bootstrap settings cleared', null, { module: 'bootstrap-settings' });
  } catch (error) {
    logger.warn('Failed to clear bootstrap settings', { module: 'bootstrap-settings' });
  }
}
