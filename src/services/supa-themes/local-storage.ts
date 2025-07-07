import { ThemeSettings } from '@/types/theme';
import { logger } from '@/utils/logging';
import { getDefaultLightTheme, getDefaultDarkTheme } from './defaults';

interface ThemeCache {
  settings: ThemeSettings;
  timestamp: number;
}

export class ThemeLocalStorage {
  private static readonly CACHE_KEY = 'anonymous_theme_settings';
  private static readonly CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

  static saveTheme(settings: ThemeSettings): void {
    try {
      const cache: ThemeCache = {
        settings,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      logger.info('Anonymous theme saved to localStorage', { module: 'theme-local-storage' });
    } catch (error) {
      logger.error('Failed to save theme to localStorage:', error);
    }
  }

  static loadTheme(): ThemeSettings | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cache: ThemeCache = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - cache.timestamp > this.CACHE_TTL) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      return cache.settings;
    } catch (error) {
      logger.error('Failed to load theme from localStorage:', error);
      localStorage.removeItem(this.CACHE_KEY);
      return null;
    }
  }

  static getDefaultSettings(): ThemeSettings {
    return {
      mode: 'light',
      lightTheme: getDefaultLightTheme(),
      darkTheme: getDefaultDarkTheme(),
      backgroundImage: null,
      backgroundOpacity: 0.5,
      autoDimDarkMode: true, // Enable auto-dim by default
      name: 'Default Theme',
      exportDate: new Date().toISOString()
    };
  }

  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      logger.info('Anonymous theme cache cleared', { module: 'theme-local-storage' });
    } catch (error) {
      logger.error('Failed to clear theme cache:', error);
    }
  }
}