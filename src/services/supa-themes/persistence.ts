import { supabase } from '@/integrations/supabase/client';
import { ThemeSettings } from '@/types/theme';
import { logger } from '@/utils/logging';
import { SupaThemeState } from './types';

export class ThemePersistence {
  // Load user theme from Supabase
  async loadUserTheme(userId: string, state: SupaThemeState): Promise<void> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('theme_settings')
        .eq('id', userId)
        .single();

      if (error) {
        logger.warn('Could not load user theme, using defaults', error);
        return;
      }

      if (profile?.theme_settings) {
        const settings = JSON.parse(profile.theme_settings) as ThemeSettings;
        this.applyThemeSettings(settings, state);
        logger.info('User theme loaded from Supabase', { module: 'supa-themes' });
      }
    } catch (error) {
      logger.error('Error loading user theme:', error);
    }
  }

  // Load admin default theme settings
  async loadAdminDefaultTheme(): Promise<ThemeSettings | null> {
    try {
      const { getAppSettingsMap } = await import('@/services/admin/settings/generalSettings');
      const settings = await getAppSettingsMap();
      
      if (settings.default_theme_settings) {
        const parsedSettings = JSON.parse(settings.default_theme_settings) as ThemeSettings;
        
        // Ensure exportDate is set for comparison with local cache
        if (!parsedSettings.exportDate) {
          parsedSettings.exportDate = new Date().toISOString();
        }
        
        logger.info('Admin default theme loaded', { module: 'supa-themes' });
        return parsedSettings;
      }
      
      logger.info('No admin default theme found', { module: 'supa-themes' });
      return null;
    } catch (error) {
      logger.warn('Failed to load admin default theme:', error);
      return null;
    }
  }

  // Save theme to Supabase
  async saveTheme(userId: string, state: SupaThemeState): Promise<boolean> {
    if (!userId) {
      logger.warn('Cannot save theme: no user ID');
      return false;
    }

    try {
      const themeSettings: ThemeSettings = {
        mode: state.mode,
        lightTheme: state.lightTheme,
        darkTheme: state.darkTheme,
        backgroundImage: state.backgroundImage,
        backgroundOpacity: state.backgroundOpacity,
        autoDimDarkMode: state.autoDimDarkMode,
        exportDate: new Date().toISOString(),
        name: 'Custom Theme'
      };

      const { error } = await supabase
        .from('profiles')
        .update({ 
          theme_settings: JSON.stringify(themeSettings),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        logger.error('Failed to save theme to Supabase:', error);
        return false;
      }

      logger.info('Theme saved successfully', { module: 'supa-themes' });
      return true;
    } catch (error) {
      logger.error('Error saving theme:', error);
      return false;
    }
  }

  // Apply theme settings to state
  applyThemeSettings(settings: ThemeSettings, state: SupaThemeState): void {
    if (settings.mode) state.mode = settings.mode;
    if (settings.lightTheme) state.lightTheme = settings.lightTheme;
    if (settings.darkTheme) state.darkTheme = settings.darkTheme;
    if (settings.backgroundImage !== undefined) state.backgroundImage = settings.backgroundImage;
    if (settings.backgroundOpacity !== undefined) state.backgroundOpacity = settings.backgroundOpacity;
    if (settings.autoDimDarkMode !== undefined) state.autoDimDarkMode = settings.autoDimDarkMode;
  }
}