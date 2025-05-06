
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
    
    // Try to fetch settings
    let data: AppSetting[] = [];
    let error = null;
    
    try {
      const response = await supabase
        .from('app_settings')
        .select('*');
      
      data = response?.data || [];
      error = response?.error;
    } catch (err) {
      error = err as Error;
    }

    if (error) {
      logger.error('Error fetching app settings:', error, { module: 'settings' });
      throw error;
    }

    // Convert to key-value map
    const settings: Record<string, string> = {};
    data.forEach((setting: AppSetting) => {
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

export async function updateAppSetting(key: string, value: string): Promise<void> {
  try {
    // Get the current user ID
    const userData = await supabase.auth.getSession();
    const userId = userData?.data?.session?.user?.id || null;
    
    // Check if the setting already exists
    const existingSettingsResponse = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key);
      
    const existingSettings = existingSettingsResponse?.data || [];
    
    if (existingSettings && existingSettings.length > 0) {
      // Update existing setting
      const updateResponse = await supabase
        .from('app_settings')
        .update({ 
          value, 
          updated_at: new Date().toISOString(), 
          updated_by: userId 
        })
        .eq('key', key);

      if (updateResponse?.error) {
        logger.error(`Error updating app setting ${key}:`, updateResponse.error, { module: 'settings' });
        throw updateResponse.error;
      }
    } else {
      // Insert new setting
      const insertResponse = await supabase
        .from('app_settings')
        .insert({ 
          key,
          value, 
          updated_at: new Date().toISOString(), 
          updated_by: userId 
        });

      if (insertResponse?.error) {
        logger.error(`Error creating app setting ${key}:`, insertResponse.error, { module: 'settings' });
        throw insertResponse.error;
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
