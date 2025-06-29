import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

interface CachedSettings {
  data: Record<string, string>;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

type SettingsChangeListener = (settings: Record<string, string>) => void;

class SettingsCacheService {
  private static instance: SettingsCacheService | null = null;
  private cache: CachedSettings | null = null;
  private fetchPromise: Promise<Record<string, string>> | null = null;
  private readonly CACHE_KEY = 'app_settings_cache';
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private listeners: Set<SettingsChangeListener> = new Set();

  static getInstance(): SettingsCacheService {
    if (!this.instance) {
      this.instance = new SettingsCacheService();
    }
    return this.instance;
  }

  private constructor() {
    this.loadFromLocalStorage();
  }

  // Add listener for settings changes
  addChangeListener(listener: SettingsChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Emit settings change event
  private emitChange(settings: Record<string, string>): void {
    this.listeners.forEach(listener => {
      try {
        listener(settings);
      } catch (error) {
        logger.warn('Error in settings change listener:', error, { module: 'settings-cache' });
      }
    });
  }

  private loadFromLocalStorage(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsedCache: CachedSettings = JSON.parse(cached);
        if (this.isCacheValid(parsedCache)) {
          this.cache = parsedCache;
          logger.info('Settings loaded from localStorage cache', { module: 'settings-cache' });
        } else {
          localStorage.removeItem(this.CACHE_KEY);
          logger.info('Expired cache removed from localStorage', { module: 'settings-cache' });
        }
      }
    } catch (error) {
      logger.warn('Failed to load settings from localStorage:', error, { module: 'settings-cache' });
      localStorage.removeItem(this.CACHE_KEY);
    }
  }

  private isCacheValid(cache: CachedSettings): boolean {
    return Date.now() - cache.timestamp < cache.ttl;
  }

  private saveToLocalStorage(settings: Record<string, string>): void {
    try {
      const cacheData: CachedSettings = {
        data: settings,
        timestamp: Date.now(),
        ttl: this.DEFAULT_TTL
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      this.cache = cacheData;
      logger.info('Settings saved to localStorage cache', { module: 'settings-cache' });
      
      // Emit change event when cache is updated with fresh data
      this.emitChange(settings);
    } catch (error) {
      logger.warn('Failed to save settings to localStorage:', error, { module: 'settings-cache' });
    }
  }

  async getSettings(): Promise<Record<string, string>> {
    // Return cached data if valid
    if (this.cache && this.isCacheValid(this.cache)) {
      logger.info('Using cached settings', { module: 'settings-cache' });
      return this.cache.data;
    }

    // If already fetching, return the existing promise
    if (this.fetchPromise) {
      logger.info('Using existing fetch promise', { module: 'settings-cache' });
      return this.fetchPromise;
    }

    // Start new fetch
    this.fetchPromise = this.fetchAndCacheSettings();
    
    try {
      const settings = await this.fetchPromise;
      return settings;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async fetchAndCacheSettings(): Promise<Record<string, string>> {
    try {
      logger.info('Fetching fresh settings from database', { module: 'settings-cache' });
      const settings = await fetchAppSettings();
      this.saveToLocalStorage(settings);
      return settings;
    } catch (error) {
      logger.error('Failed to fetch settings:', error, { module: 'settings-cache' });
      
      // Return cached data even if expired as fallback
      if (this.cache) {
        logger.info('Using expired cache as fallback', { module: 'settings-cache' });
        return this.cache.data;
      }
      
      // Return empty object as final fallback
      return {};
    }
  }

  getSetting(key: string, defaultValue: string = ''): string {
    if (this.cache && this.isCacheValid(this.cache)) {
      return this.cache.data[key] || defaultValue;
    }
    return defaultValue;
  }

  invalidateCache(): void {
    this.cache = null;
    localStorage.removeItem(this.CACHE_KEY);
    logger.info('Settings cache invalidated', { module: 'settings-cache' });
  }

  // Method to update cache when settings are changed in admin panel
  updateCache(key: string, value: string): void {
    if (this.cache) {
      this.cache.data[key] = value;
      this.cache.timestamp = Date.now(); // Refresh timestamp
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
      logger.info(`Setting ${key} updated in cache`, { module: 'settings-cache' });
      
      // Emit change event when cache is manually updated
      this.emitChange(this.cache.data);
    }
  }
}

export const settingsCacheService = SettingsCacheService.getInstance();
