import { logger } from '@/utils/logging';
import { SupaMenuState, MenuStateListener, MenuConfig } from './types';
import { getDefaultMenuConfig, getDefaultLightMenuTheme, getDefaultDarkMenuTheme } from './defaults';
import { MenuThemeApplier } from './theme-applier';
import { MenuPersistence } from './persistence';

class SupaMenuCore {
  private state: SupaMenuState;
  private listeners: Set<MenuStateListener> = new Set();
  private userId: string | null = null;
  private currentThemeMode: 'light' | 'dark' = 'light';

  // Service instances
  private themeApplier: MenuThemeApplier;
  private persistence: MenuPersistence;

  constructor() {
    this.state = {
      config: getDefaultMenuConfig(),
      isReady: false,
      adminMenuSettings: undefined
    };

    // Initialize services
    this.themeApplier = new MenuThemeApplier();
    this.persistence = new MenuPersistence();
  }

  // Core initialization
  async initialize(userId?: string): Promise<void> {
    if (userId && userId !== this.userId) {
      this.userId = userId;
      await this.persistence.loadUserMenuSettings(userId, this.state);
    } else if (!userId) {
      // Load admin defaults for unauthenticated users
      await this.loadAdminDefaults();
    }
    
    this.state.isReady = true;
    this.applyCurrentTheme();
    this.notifyListeners();
    
    logger.info('SupaMenu initialized', { module: 'supa-menu', userId: this.userId });
  }

  // Load admin defaults (for unauthenticated users)
  private async loadAdminDefaults(): Promise<void> {
    try {
      const adminDefaults = await this.persistence.loadAdminDefaultMenuSettings();
      
      if (adminDefaults) {
        this.state.config = adminDefaults;
        logger.info('Admin default menu settings loaded for unauthenticated user', { module: 'supa-menu' });
      } else {
        logger.info('No admin default menu settings found, using hardcoded defaults', { module: 'supa-menu' });
      }
    } catch (error) {
      logger.warn('Failed to load admin default menu settings, using hardcoded defaults:', error);
    }
  }

  // Apply theme based on current mode
  private applyCurrentTheme(): void {
    const theme = this.currentThemeMode === 'dark' 
      ? getDefaultDarkMenuTheme() 
      : getDefaultLightMenuTheme();
    
    // Merge with custom theme if available
    if (this.state.adminMenuSettings?.theme) {
      this.state.config.theme = { ...theme, ...this.state.adminMenuSettings.theme };
    } else {
      this.state.config.theme = theme;
    }

    this.themeApplier.applyMenuTheme(this.state.config.theme);
  }

  // State management
  getState(): SupaMenuState {
    return { ...this.state };
  }

  subscribe(listener: MenuStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Public API - Theme mode synchronization
  setThemeMode(mode: 'light' | 'dark'): void {
    this.currentThemeMode = mode;
    this.applyCurrentTheme();
    this.notifyListeners();
  }

  // Public API - Admin menu configuration (admin only)
  async updateAdminMenuSettings(config: Partial<MenuConfig>): Promise<boolean> {
    if (!this.userId) {
      logger.warn('Cannot update admin menu settings: no user ID');
      return false;
    }

    try {
      this.state.adminMenuSettings = { 
        ...this.state.config,
        ...config 
      };
      
      this.state.config = { ...this.state.config, ...config };
      this.applyCurrentTheme();
      this.notifyListeners();
      
      const success = await this.persistence.saveAdminMenuSettings(this.state.adminMenuSettings);
      return success;
    } catch (error) {
      logger.error('Error updating admin menu settings:', error);
      return false;
    }
  }

  // Public API - Reset to defaults
  async resetToDefaults(): Promise<boolean> {
    try {
      this.state.config = getDefaultMenuConfig();
      this.state.adminMenuSettings = undefined;
      
      this.applyCurrentTheme();
      this.notifyListeners();

      // Save as admin default if user is admin
      if (this.userId) {
        return await this.persistence.saveAdminMenuSettings(this.state.config);
      }

      return true;
    } catch (error) {
      logger.error('Error resetting menu settings:', error);
      return false;
    }
  }

  // Cleanup
  destroy(): void {
    this.listeners.clear();
    this.userId = null;
  }
}

// Export singleton instance
export const supaMenu = new SupaMenuCore();