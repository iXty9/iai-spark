
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

type AppSetting = {
  id: string;
  key: string;
  value: string;
  updated_at: string;
  updated_by: string | null;
};

export async function fetchAppSettings(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*');

    if (error) {
      logger.error('Error fetching app settings:', error, { module: 'settings' });
      throw error;
    }

    // Convert to key-value map
    const settings: Record<string, string> = {};
    data?.forEach((setting: AppSetting) => {
      settings[setting.key] = setting.value;
    });

    return settings;
  } catch (error) {
    logger.error('Unexpected error in fetchAppSettings:', error, { module: 'settings' });
    throw error;
  }
}

export async function updateAppSetting(key: string, value: string): Promise<void> {
  try {
    // Get the current user ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;
    
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        value, 
        updated_at: new Date().toISOString(), 
        updated_by: userId 
      })
      .eq('key', key);

    if (error) {
      logger.error(`Error updating app setting ${key}:`, error, { module: 'settings' });
      throw error;
    }
  } catch (error) {
    logger.error(`Unexpected error updating app setting ${key}:`, error, { module: 'settings' });
    throw error;
  }
}
