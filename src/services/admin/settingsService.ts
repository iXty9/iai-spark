
import { supabase } from '@/integrations/supabase/client';

export const fetchAppSettings = async (): Promise<Record<string, string>> => {
  console.log('[SETTINGS-SERVICE] fetchAppSettings called');
  
  try {
    console.log('[SETTINGS-SERVICE] Making Supabase query to app_settings table');
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value');

    if (error) {
      console.error('[SETTINGS-SERVICE] Supabase query error:', error);
      throw error;
    }

    console.log('[SETTINGS-SERVICE] Raw data from Supabase:', data);
    
    if (!data) {
      console.log('[SETTINGS-SERVICE] No data returned from Supabase, returning empty object');
      return {};
    }

    // Transform array of key-value pairs into an object
    const settings: Record<string, string> = {};
    data.forEach(item => {
      settings[item.key] = item.value;
      console.log('[SETTINGS-SERVICE] Added setting:', item.key, '=', item.value);
    });

    console.log('[SETTINGS-SERVICE] Final settings object:', settings);
    console.log('[SETTINGS-SERVICE] Settings count:', Object.keys(settings).length);
    
    return settings;
  } catch (error) {
    console.error('[SETTINGS-SERVICE] fetchAppSettings error:', error);
    throw error;
  }
};

export const updateAppSetting = async (key: string, value: string): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .upsert([
        { key: key, value: value }
      ], { onConflict: 'key' });

    if (error) {
      console.error('Error updating app setting:', error);
      throw error;
    }

    console.log('App setting updated successfully:', key, value, data);
  } catch (error) {
    console.error('Failed to update app setting:', error);
    throw error;
  }
};

// Export functions from the settings modules
export { saveConnectionConfig, fetchConnectionConfig } from './settings/connectionSettings';
export { getAppSettingsMap, setDefaultThemeSettings } from './settings/generalSettings';
