
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

// Define the AppSettings type
export interface AppSettings {
  avatar_url?: string;
  default_theme?: string;
  default_theme_settings?: string;
  [key: string]: any;
}

/**
 * Fetch application settings from the database
 */
export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value');
    
    if (error) {
      logger.error('Error fetching app settings:', error);
      return {};
    }
    
    // Convert array of key-value pairs to object
    const settings: AppSettings = {};
    if (data && Array.isArray(data)) {
      data.forEach((item: { key: string; value: string }) => {
        settings[item.key] = item.value;
      });
    }
    
    return settings;
  } catch (error) {
    logger.error('Unexpected error in fetchAppSettings:', error);
    return {};
  }
}

/**
 * Force reload settings from the database
 * Used when settings were possibly updated elsewhere or during app initialization
 */
export async function forceReloadSettings(): Promise<AppSettings> {
  try {
    logger.info('Forcing reload of app settings', { module: 'settings' });
    
    const settings = await fetchAppSettings();
    return settings;
  } catch (error) {
    logger.error('Error in forceReloadSettings:', error);
    return {};
  }
}

/**
 * Update an application setting
 */
export async function updateAppSetting(
  key: string, 
  value: string
): Promise<boolean> {
  try {
    // Check if setting exists
    const checkResponse = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key);
    
    const existingData = checkResponse.data;
    const checkError = checkResponse.error;
    
    if (checkError) {
      logger.error(`Error checking if setting ${key} exists:`, checkError);
      return false;
    }
    
    let result;
    
    if (existingData && existingData.length > 0) {
      // Update existing setting
      result = await supabase
        .from('app_settings')
        .update({ value })
        .eq('key', key);
    } else {
      // Insert new setting
      result = await supabase
        .from('app_settings')
        .insert({ key, value });
    }
    
    if (result.error) {
      logger.error(`Error updating app setting ${key}:`, result.error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Unexpected error updating setting ${key}:`, error);
    return false;
  }
}

/**
 * Delete an application setting
 */
export async function deleteAppSetting(key: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .delete()
      .eq('key', key);
    
    if (error) {
      logger.error(`Error deleting app setting ${key}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Unexpected error deleting setting ${key}:`, error);
    return false;
  }
}
