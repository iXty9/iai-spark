
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { ThemeSettings } from '@/types/theme';

type AppSetting = {
  id: string;
  key: string;
  value: string;
  updated_at: string;
  updated_by: string | null;
};

type SettingsQueryResult = {
  data: AppSetting[] | null;
  error: Error | null;
};

// Simple in-memory cache
let settingsCache: Record<string, string> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export async function fetchAppSettings(): Promise<Record<string, string>> {
  try {
    const now = Date.now();
    
    // Return cached settings if valid
    if (settingsCache && (now - lastFetchTime < CACHE_DURATION)) {
      logger.info('Using cached app settings', { 
        module: 'settings', 
        cache: true,
        cacheAge: now - lastFetchTime
      });
      return settingsCache;
    }
    
    // Fetch fresh settings if cache expired or doesn't exist
    logger.info('Fetching app settings from database', { module: 'settings' });
    
    // Use simplified typing approach
    const result = await supabase
      .from('app_settings')
      .select() as unknown as SettingsQueryResult;
    
    if (result.error) {
      logger.error('Error fetching app settings:', result.error, { module: 'settings' });
      throw result.error;
    }

    // Safe access to data
    const settingsData = result.data || [];
    
    // Convert to key-value map
    const settings: Record<string, string> = {};
    settingsData.forEach((setting: AppSetting) => {
      settings[setting.key] = setting.value;
    });
    
    // Update cache
    settingsCache = settings;
    lastFetchTime = now;
    
    // Log what we found
    const hasDefaultTheme = !!settings.default_theme_settings;
    logger.info('App settings fetched successfully', { 
      module: 'settings', 
      settingCount: Object.keys(settings).length,
      hasDefaultTheme
    });
    
    if (hasDefaultTheme) {
      try {
        const themeData = JSON.parse(settings.default_theme_settings);
        logger.info('Default theme parsed successfully', {
          module: 'settings',
          hasBackground: !!themeData?.backgroundImage,
          mode: themeData?.mode
        });
      } catch (e) {
        logger.warn('Failed to parse default theme settings for logging', { module: 'settings' });
      }
    }

    return settings;
  } catch (error) {
    logger.error('Unexpected error in fetchAppSettings:', error, { module: 'settings' });
    throw error;
  }
}

// New function to force clear cache and reload settings
export async function forceReloadSettings(): Promise<Record<string, string>> {
  logger.info('Force clearing settings cache', { module: 'settings' });
  // Clear the cache
  settingsCache = null;
  lastFetchTime = 0;
  
  // Fetch fresh settings
  return await fetchAppSettings();
}

type UpdateResult = {
  error: Error | null;
};

export async function updateAppSetting(key: string, value: string): Promise<void> {
  try {
    // Get the current user ID
    const userData = await supabase.auth.getSession();
    const userId = userData?.data?.session?.user?.id || null;
    
    // Check if the setting already exists
    const existingResult = await supabase
      .from('app_settings')
      .select()
      .eq('key', key) as unknown as SettingsQueryResult;
    
    // Safely check for errors
    if (existingResult.error) {
      logger.error(`Error checking existing app setting ${key}:`, existingResult.error, { module: 'settings' });
      throw existingResult.error;
    }
    
    // Check if setting exists
    const existingSetting = existingResult.data && existingResult.data.length > 0 ? existingResult.data[0] : null;
    
    if (existingSetting) {
      // Update existing setting
      const updateResult = await supabase
        .from('app_settings')
        .update({ 
          value, 
          updated_at: new Date().toISOString(), 
          updated_by: userId 
        })
        .eq('key', key) as unknown as UpdateResult;
          
      // Safely check for errors in update result
      if (updateResult.error) {
        logger.error(`Error updating app setting ${key}:`, updateResult.error, { module: 'settings' });
        throw updateResult.error;
      }
    } else {
      // Insert new setting
      const insertResult = await supabase
        .from('app_settings')
        .insert({ 
          key,
          value, 
          updated_at: new Date().toISOString(), 
          updated_by: userId 
        }) as unknown as UpdateResult;
          
      // Safely check for errors in insert result
      if (insertResult.error) {
        logger.error(`Error creating app setting ${key}:`, insertResult.error, { module: 'settings' });
        throw insertResult.error;
      }
    }
    
    // Clear the cache so next fetch gets fresh data
    settingsCache = null;
    
  } catch (error) {
    logger.error(`Unexpected error updating app setting ${key}:`, error, { module: 'settings' });
    throw error;
  }
}

export async function setDefaultTheme(themeSettings: ThemeSettings): Promise<void> {
  try {
    // Convert theme settings object to JSON string
    const themeSettingsJSON = JSON.stringify(themeSettings);
    
    // Save as default theme in app_settings
    await updateAppSetting('default_theme_settings', themeSettingsJSON);
    
    // Clear the cache
    settingsCache = null;
    
    logger.info('Default theme settings updated successfully', { 
      module: 'settings',
      hasBackground: !!themeSettings.backgroundImage,
      mode: themeSettings.mode
    });
  } catch (error) {
    logger.error('Error setting default theme:', error, { module: 'settings' });
    throw error;
  }
}
