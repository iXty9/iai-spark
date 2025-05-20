import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

/**
 * Fetch all settings
 */
export async function fetchAllSettings() {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client
      .from('app_settings')
      .select('*')
      .order('key', { ascending: true });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching settings', error);
    return [];
  }
}

/**
 * Create a new setting
 */
export async function createSetting(key: string, value: string, description?: string) {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client
      .from('app_settings')
      .insert({
        key,
        value,
        description: description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error creating setting', error);
    throw error;
  }
}

/**
 * Delete a setting
 */
export async function deleteSetting(settingId: string) {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { error } = await client
      .from('app_settings')
      .delete()
      .eq('id', settingId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error deleting setting', error);
    throw error;
  }
}

/**
 * Update a setting
 */
export async function updateSetting(settingId: string, updates: { key?: string; value?: string; description?: string }) {
  try {
    const client = await supabase;
    if (!client) throw new Error('Supabase client not available');
    
    const { data, error } = await client
      .from('app_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', settingId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error updating setting', error);
    throw error;
  }
}

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
