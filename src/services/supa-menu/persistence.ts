import { SupaMenuState, MenuConfig } from './types';
import { logger } from '@/utils/logging';

export class MenuPersistence {
  async loadUserMenuSettings(userId: string, state: SupaMenuState): Promise<void> {
    try {
      // For now, we'll use the admin settings as the source
      // In the future, this could be extended to per-user customization
      const adminSettings = await this.loadAdminDefaultMenuSettings();
      if (adminSettings) {
        state.config = adminSettings;
        state.adminMenuSettings = adminSettings;
        logger.info('User menu settings loaded from admin defaults', { module: 'supa-menu' });
      }
    } catch (error) {
      logger.error('Error loading user menu settings:', error);
    }
  }

  async loadAdminDefaultMenuSettings(): Promise<MenuConfig | null> {
    try {
      // Load from app_settings table using the same pattern as themes
      const { getAppSettingsMap } = await import('@/services/admin/settings/generalSettings');
      const settings = await getAppSettingsMap();
      
      if (settings.default_menu_settings) {
        const parsedSettings = JSON.parse(settings.default_menu_settings) as MenuConfig;
        logger.info('Admin default menu settings loaded', { module: 'supa-menu' });
        return parsedSettings;
      }
      
      logger.info('No admin default menu settings found', { module: 'supa-menu' });
      return null;
    } catch (error) {
      logger.warn('Failed to load admin default menu settings:', error);
      return null;
    }
  }

  async saveAdminMenuSettings(config: MenuConfig): Promise<boolean> {
    try {
      const { updateAppSetting } = await import('@/services/admin/settingsService');
      
      await updateAppSetting('default_menu_settings', JSON.stringify(config));
      
      logger.info('Admin menu settings saved successfully', { module: 'supa-menu' });
      return true;
    } catch (error) {
      logger.error('Error saving admin menu settings:', error);
      return false;
    }
  }
}