
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

// Enhanced cache management
let settingsCache: Record<string, string> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15000; // 15 seconds cache for production (reduced from 30s for more responsive updates)
// Use shorter cache during development for easier testing
const DEV_CACHE_DURATION = 3000; // 3 seconds in development (reduced from 5s)

// Public method to clear the cache, useful when settings change
export function clearSettingsCache() {
  logger.info('Settings cache manually cleared', { module: 'settings' });
  settingsCache = null;
  lastFetchTime = 0;
}

export async function fetchAppSettings(): Promise<Record<string, string>> {
  try {
    const now = Date.now();
    const cacheDuration = process.env.NODE_ENV === 'development' 
      ? DEV_CACHE_DURATION 
      : CACHE_DURATION;
    
    // Return cached settings if valid
    if (settingsCache && (now - lastFetchTime < cacheDuration)) {
      logger.info('Using cached app settings', { 
        module: 'settings', 
        cache: true,
        cacheAge: now - lastFetchTime,
        settingsCount: Object.keys(settingsCache).length
      });
      return settingsCache;
    }
    
    // Fetch fresh settings if cache expired or doesn't exist
    logger.info('Fetching app settings from database', { module: 'settings' });
    const { data, error } = await supabase
      .from('app_settings')
      .select('*');

    if (error) {
      logger.error('Error fetching app settings:', error, { module: 'settings' });
      
      // If we have a cache, return it as fallback even if expired
      if (settingsCache) {
        logger.warn('Using expired cache as fallback after fetch error', { module: 'settings' });
        return settingsCache;
      }
      
      throw error;
    }

    // Convert to key-value map
    const settings: Record<string, string> = {};
    data?.forEach((setting: AppSetting) => {
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
    
    // Last resort: return empty settings object to prevent crashes
    return {};
  }
}

export async function updateAppSetting(key: string, value: string): Promise<void> {
  try {
    // Get the current user ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;
    
    // Check if the setting already exists
    const { data: existingSettings } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key);
      
    if (existingSettings && existingSettings.length > 0) {
      // Update existing setting
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
    } else {
      // Insert new setting
      const { error } = await supabase
        .from('app_settings')
        .insert({ 
          key,
          value, 
          updated_at: new Date().toISOString(), 
          updated_by: userId 
        });

      if (error) {
        logger.error(`Error creating app setting ${key}:`, error, { module: 'settings' });
        throw error;
      }
    }
    
    // Force clear the cache immediately after an update
    clearSettingsCache();
    logger.info(`App setting ${key} updated and cache cleared`, { module: 'settings' });
    
  } catch (error) {
    logger.error(`Unexpected error updating app setting ${key}:`, error, { module: 'settings' });
    throw error;
  }
}

export async function setDefaultTheme(themeSettings: ThemeSettings): Promise<void> {
  try {
    // Convert theme settings object to JSON string
    const themeSettingsJSON = JSON.stringify(themeSettings);
    
    logger.info('Setting default theme for all users', { 
      module: 'settings',
      hasBackground: !!themeSettings.backgroundImage,
      mode: themeSettings.mode
    });
    
    // Save as default theme in app_settings
    await updateAppSetting('default_theme_settings', themeSettingsJSON);
    
    // The updateAppSetting function already clears the cache
    
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
