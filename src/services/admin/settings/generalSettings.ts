import { logger } from '@/utils/logging';
import { withSupabase } from '@/services/supabase/connection-service';
import { AppSettings } from './types';

// Add the required functions
export function getAppSettingsMap() {
  return {};
}

export async function updateAppSetting(key: string, value: string) {
  return true;
}

/**
 * Fetch all application settings
 */
export async function fetchAppSettings(): Promise<AppSettings | null> {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client
        .from('app_settings')
        .select('*');
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      // Convert array of settings to a single object
      const settings: AppSettings = {
        app_name: 'My App',
        site_title: 'My Site',
      };
      
      data.forEach((setting) => {
        if (setting.key && setting.value !== undefined) {
          settings[setting.key] = setting.value;
        }
      });
      
      return settings;
    });
  } catch (error) {
    logger.error('Error fetching app settings', error, { module: 'settings' });
    return null;
  }
}

/**
 * Update application settings
 */
export async function updateAppSettings(settings: Partial<AppSettings>): Promise<boolean> {
  try {
    return await withSupabase(async (client) => {
      // Convert settings object to array of key-value pairs
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value?.toString() || '',
      }));
      
      // Upsert settings
      const { error } = await client
        .from('app_settings')
        .upsert(settingsArray, { onConflict: 'key' });
      
      if (error) {
        throw error;
      }
      
      logger.info('App settings updated successfully', { 
        module: 'settings',
        count: settingsArray.length
      });
      
      return true;
    });
  } catch (error) {
    logger.error('Error updating app settings', error, { module: 'settings' });
    return false;
  }
}

/**
 * Get a specific app setting
 */
export async function getAppSetting(key: string): Promise<string | null> {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data?.value || null;
    });
  } catch (error) {
    logger.error(`Error fetching app setting: ${key}`, error, { module: 'settings' });
    return null;
  }
}

/**
 * Initialize default app settings if they don't exist
 */
export async function initializeDefaultSettings(): Promise<boolean> {
  try {
    const defaultSettings: AppSettings = {
      app_name: 'My Application',
      site_title: 'Welcome to My Application',
      app_description: 'A powerful application built with Supabase',
      primary_color: '#3b82f6',
      accent_color: '#10b981',
      allow_signups: true,
      require_email_verification: true,
      max_upload_size_mb: 10,
    };
    
    return await updateAppSettings(defaultSettings);
  } catch (error) {
    logger.error('Error initializing default settings', error, { module: 'settings' });
    return false;
  }
}
