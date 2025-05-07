
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

interface AppSettings {
  app_name?: string;
  site_title?: string;
  default_theme_settings?: string;
  [key: string]: string | undefined;
}

export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    // Use a simpler query to avoid type issues
    const result = await supabase
      .from('app_settings')
      .select('key, value');
      
    // Handle errors
    if (result.error) {
      logger.error('Error fetching app settings:', result.error);
      return {};
    }
    
    // Transform into an object
    const settings: AppSettings = {};
    if (result.data) {
      result.data.forEach(row => {
        settings[row.key] = row.value;
      });
    }
    
    return settings;
  } catch (error) {
    logger.error('Unexpected error in fetchAppSettings:', error);
    return {};
  }
}

export async function updateAppSetting(key: string, value: string): Promise<boolean> {
  try {
    // Check if setting exists using a simpler query pattern
    const existingResult = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key);
      
    if (existingResult.error) {
      logger.error(`Error checking if setting ${key} exists:`, existingResult.error);
      return false;
    }
    
    let result;
    
    if (existingResult.data && existingResult.data.length > 0) {
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
      logger.error(`Error updating setting ${key}:`, result.error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Unexpected error updating setting ${key}:`, error);
    return false;
  }
}

/**
 * Get all app settings as a key-value map
 */
export async function getAppSettingsMap(): Promise<Record<string, string>> {
  try {
    const result = await supabase
      .from('app_settings')
      .select('key, value');
      
    if (result.error) {
      logger.error('Error fetching app settings map:', result.error);
      return {};
    }
    
    const settingsMap: Record<string, string> = {};
    if (result.data) {
      result.data.forEach(row => {
        settingsMap[row.key] = row.value;
      });
    }
    
    return settingsMap;
  } catch (error) {
    logger.error('Unexpected error in getAppSettingsMap:', error);
    return {};
  }
}
