
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

export const fetchAppSettings = async (): Promise<Record<string, string>> => {
  logger.info('Fetching app settings', null, { module: 'settings-service' });
  
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value');

    if (error) {
      logger.error('Supabase query error', error, { module: 'settings-service' });
      throw error;
    }
    
    if (!data) {
      logger.info('No settings data returned', null, { module: 'settings-service' });
      return {};
    }

    // Transform array of key-value pairs into an object
    const settings: Record<string, string> = {};
    data.forEach(item => {
      settings[item.key] = item.value;
    });

    logger.info('App settings loaded successfully', { count: Object.keys(settings).length }, { module: 'settings-service' });
    
    return settings;
  } catch (error) {
    logger.error('Failed to fetch app settings', error, { module: 'settings-service' });
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
      logger.error('Error updating app setting', error, { module: 'settings-service' });
      throw error;
    }

    logger.info('App setting updated successfully', { key }, { module: 'settings-service' });
  } catch (error) {
    logger.error('Failed to update app setting', error, { module: 'settings-service' });
    throw error;
  }
};

// Export functions from the settings modules
export { saveConnectionConfig, fetchConnectionConfig } from './settings/connectionSettings';
export { getAppSettingsMap, setDefaultThemeSettings } from './settings/generalSettings';
