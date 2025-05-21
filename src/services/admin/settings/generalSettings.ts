import { logger } from '@/utils/logging';
import { withSupabase } from '@/utils/supabase-helpers';
import { AppSettings } from './types';

/**
 * Saves app settings to the database
 * @param settings Application settings to save
 */
export async function saveAppSettings(settings: AppSettings): Promise<boolean> {
  try {
    return await withSupabase(async (client) => {
      // Convert the settings object to key-value pairs
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }));
      
      // For each setting, upsert it to the app_settings table
      const promises = settingsArray.map(async ({ key, value }) => {
        // Check if the setting already exists
        const { data: existingSetting } = await client
          .from('app_settings')
          .select('id')
          .eq('key', key)
          .single();
          
        if (existingSetting) {
          // Update existing setting
          const { error } = await client
            .from('app_settings')
            .update({ value })
            .eq('id', existingSetting.id);
          
          if (error) {
            logger.error(`Failed to update app setting: ${key}`, error, { module: 'settings' });
            return false;
          }
        } else {
          // Insert new setting
          const { error } = await client
            .from('app_settings')
            .insert({ key, value });
            
          if (error) {
            logger.error(`Failed to insert app setting: ${key}`, error, { module: 'settings' });
            return false;
          }
        }
        
        return true;
      });
      
      // Wait for all operations to complete
      const results = await Promise.all(promises);
      
      // Return true only if all operations succeeded
      return results.every((result) => result === true);
    });
  } catch (error) {
    logger.error('Failed to save app settings', error, { module: 'settings' });
    return false;
  }
}

/**
 * Retrieves app settings from the database
 */
export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'app_name',
          'site_title',
          'app_description',
          'primary_color',
          'accent_color',
          'allow_signups',
          'require_email_verification',
          'max_upload_size_mb',
          'ga_tracking_id',
          'enable_social_login',
          'favicon_url',
          'logo_url',
          'avatar_url',
          'default_theme_settings'
        ]);
        
      if (error) {
        logger.error('Failed to fetch app settings', error, { module: 'settings' });
        throw error;
      }
      
      // Convert the array of key-value pairs to a settings object
      const settings = data.reduce((acc, { key, value }) => {
        // Try to parse JSON values
        let parsedValue = value;
        try {
          // Only attempt to parse if value looks like JSON
          if (value && (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false' || !isNaN(Number(value)))) {
            parsedValue = JSON.parse(value);
          }
        } catch {
          // Keep the original value if parsing fails
        }
        
        return {
          ...acc,
          [key]: parsedValue,
        };
      }, {} as AppSettings);
      
      // Set default values for required fields
      const defaultSettings: AppSettings = {
        app_name: 'Ixty AI',
        site_title: 'Ixty AI - The Everywhere Intelligent Assistant',
        key: '',
        value: '',
        ...settings
      };
      
      return defaultSettings;
    });
  } catch (error) {
    logger.error('Failed to fetch app settings', error, { module: 'settings' });
    // Return default settings if fetch fails
    return {
      app_name: 'Ixty AI',
      site_title: 'Ixty AI - The Everywhere Intelligent Assistant',
      key: '',
      value: ''
    };
  }
}
