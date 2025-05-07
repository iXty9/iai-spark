
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { AppSettings } from './types';

/**
 * Fetch all app settings as a key-value map
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

/**
 * Fetch all application settings
 */
export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const result = await supabase
      .from('app_settings')
      .select('key, value');
      
    if (result.error) {
      logger.error('Error fetching app settings:', result.error);
      return {};
    }
    
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

/**
 * Update a single application setting
 */
export async function updateAppSetting(key: string, value: string): Promise<boolean> {
  try {
    // Check if setting exists
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
