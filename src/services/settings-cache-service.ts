
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
      console.log('[SETTINGS-CACHE] Creating new singleton instance');
      this.instance = new SettingsCacheService();
    }
    return this.instance;
  }

  private constructor() {
    console.log('[SETTINGS-CACHE] Constructor called - initializing service');
    try {
      this.loadFromLocalStorage();
      // Immediately start fetching fresh data if no valid cache
      if (!this.cache || !this.isCacheValid(this.cache)) {
        console.log('[SETTINGS-CACHE] No valid cache on initialization, starting fresh fetch');
        this.prefetchSettings();
      } else {
        console.log('[SETTINGS-CACHE] Valid cache found on initialization:', this.cache.data);
      }
    } catch (error) {
      console.error('[SETTINGS-CACHE] Constructor error:', error);
    }
  }

  // Prefetch settings without waiting for a request
  private async prefetchSettings(): Promise<void> {
    console.log('[SETTINGS-CACHE] Starting prefetch');
    try {
      await this.getSettings();
      console.log('[SETTINGS-CACHE] Prefetch completed successfully');
    } catch (error) {
      console.error('[SETTINGS-CACHE] Prefetch failed:', error);
    }
  }

  // Add listener for settings changes
  addChangeListener(listener: SettingsChangeListener): () => void {
    console.log('[SETTINGS-CACHE] Adding change listener, total listeners:', this.listeners.size + 1);
    this.listeners.add(listener);
    
    // If we have valid cached data, immediately notify the new listener
    if (this.cache && this.isCacheValid(this.cache)) {
      console.log('[SETTINGS-CACHE] Immediately notifying new listener with cached data:', this.cache.data);
      setTimeout(() => {
        try {
          listener(this.cache!.data);
          console.log('[SETTINGS-CACHE] Immediate listener notification sent successfully');
        } catch (error) {
          console.error('[SETTINGS-CACHE] Error in immediate listener notification:', error);
        }
      }, 0);
    } else {
      console.log('[SETTINGS-CACHE] No valid cache to notify listener immediately');
    }
    
    return () => {
      this.listeners.delete(listener);
      console.log('[SETTINGS-CACHE] Listener removed, remaining listeners:', this.listeners.size);
    };
  }

  // Emit settings change event
  private emitChange(settings: Record<string, string>): void {
    console.log('[SETTINGS-CACHE] Emitting change event to', this.listeners.size, 'listeners with data:', settings);
    this.listeners.forEach((listener, index) => {
      try {
        console.log('[SETTINGS-CACHE] Calling listener', index + 1);
        listener(settings);
        console.log('[SETTINGS-CACHE] Listener', index + 1, 'called successfully');
      } catch (error) {
        console.error('[SETTINGS-CACHE] Error in settings change listener', index + 1, ':', error);
      }
    });
  }

  private loadFromLocalStorage(): void {
    console.log('[SETTINGS-CACHE] Loading from localStorage');
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        console.log('[SETTINGS-CACHE] Found cached data in localStorage');
        const parsedCache: CachedSettings = JSON.parse(cached);
        if (this.isCacheValid(parsedCache)) {
          this.cache = parsedCache;
          console.log('[SETTINGS-CACHE] Valid settings loaded from localStorage cache:', parsedCache.data);
          
          // Emit change event for valid cached data on initial load
          setTimeout(() => {
            console.log('[SETTINGS-CACHE] Emitting initial change event from localStorage');
            this.emitChange(parsedCache.data);
          }, 0);
        } else {
          console.log('[SETTINGS-CACHE] Cached data expired, removing from localStorage');
          localStorage.removeItem(this.CACHE_KEY);
        }
      } else {
        console.log('[SETTINGS-CACHE] No cached settings found in localStorage');
      }
    } catch (error) {
      console.error('[SETTINGS-CACHE] Failed to load settings from localStorage:', error);
      localStorage.removeItem(this.CACHE_KEY);
    }
  }

  private isCacheValid(cache: CachedSettings): boolean {
    const isValid = Date.now() - cache.timestamp < cache.ttl;
    console.log('[SETTINGS-CACHE] Cache validity check:', isValid, 'Age:', Date.now() - cache.timestamp, 'TTL:', cache.ttl);
    return isValid;
  }

  private saveToLocalStorage(settings: Record<string, string>): void {
    console.log('[SETTINGS-CACHE] Saving to localStorage:', settings);
    try {
      const cacheData: CachedSettings = {
        data: settings,
        timestamp: Date.now(),
        ttl: this.DEFAULT_TTL
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      this.cache = cacheData;
      console.log('[SETTINGS-CACHE] Settings saved to localStorage cache successfully');
      
      // Emit change event when cache is updated with fresh data
      console.log('[SETTINGS-CACHE] Emitting change event after saving to localStorage');
      this.emitChange(settings);
    } catch (error) {
      console.error('[SETTINGS-CACHE] Failed to save settings to localStorage:', error);
    }
  }

  async getSettings(): Promise<Record<string, string>> {
    console.log('[SETTINGS-CACHE] getSettings() called', { 
      hasCache: !!this.cache, 
      isCacheValid: this.cache ? this.isCacheValid(this.cache) : false,
      hasFetchPromise: !!this.fetchPromise
    });

    // Return cached data if valid AND emit change events
    if (this.cache && this.isCacheValid(this.cache)) {
      console.log('[SETTINGS-CACHE] Using cached settings:', this.cache.data);
      
      // Emit change event with a small delay to ensure hooks are ready
      setTimeout(() => {
        console.log('[SETTINGS-CACHE] Emitting change event from getSettings (cached)');
        this.emitChange(this.cache!.data);
      }, 10);
      
      return this.cache.data;
    }

    // If already fetching, return the existing promise
    if (this.fetchPromise) {
      console.log('[SETTINGS-CACHE] Using existing fetch promise');
      return this.fetchPromise;
    }

    // Start new fetch
    console.log('[SETTINGS-CACHE] Starting fresh settings fetch');
    this.fetchPromise = this.fetchAndCacheSettings();
    
    try {
      const settings = await this.fetchPromise;
      console.log('[SETTINGS-CACHE] Fresh settings fetch completed successfully:', settings);
      return settings;
    } catch (error) {
      console.error('[SETTINGS-CACHE] Fresh settings fetch failed:', error);
      throw error;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async fetchAndCacheSettings(): Promise<Record<string, string>> {
    console.log('[SETTINGS-CACHE] fetchAndCacheSettings() called');
    try {
      console.log('[SETTINGS-CACHE] Calling fetchAppSettings() from database');
      const settings = await fetchAppSettings();
      console.log('[SETTINGS-CACHE] Database fetch successful, got settings:', settings, 'Count:', Object.keys(settings).length);
      this.saveToLocalStorage(settings);
      return settings;
    } catch (error) {
      console.error('[SETTINGS-CACHE] Failed to fetch settings from database:', error);
      
      // Return cached data even if expired as fallback
      if (this.cache) {
        console.log('[SETTINGS-CACHE] Using expired cache as fallback:', this.cache.data);
        return this.cache.data;
      }
      
      // Return empty object as final fallback with default values
      const fallbackSettings = {
        ai_agent_name: 'AI Assistant',
        app_name: 'The Everywhere Intelligent Assistant'
      };
      console.log('[SETTINGS-CACHE] No cache available, returning fallback settings:', fallbackSettings);
      
      // Emit change event with fallback data to unblock hooks
      setTimeout(() => {
        console.log('[SETTINGS-CACHE] Emitting change event with fallback data');
        this.emitChange(fallbackSettings);
      }, 0);
      
      return fallbackSettings;
    }
  }

  getSetting(key: string, defaultValue: string = ''): string {
    if (this.cache && this.isCacheValid(this.cache)) {
      const value = this.cache.data[key] || defaultValue;
      console.log('[SETTINGS-CACHE] getSetting(' + key + ') = ' + value + ' (from cache)');
      return value;
    }
    console.log('[SETTINGS-CACHE] getSetting(' + key + ') = ' + defaultValue + ' (no cache)');
    return defaultValue;
  }

  invalidateCache(): void {
    console.log('[SETTINGS-CACHE] Cache invalidated');
    this.cache = null;
    localStorage.removeItem(this.CACHE_KEY);
  }

  // Method to update cache when settings are changed in admin panel
  updateCache(key: string, value: string): void {
    console.log('[SETTINGS-CACHE] updateCache called:', key, '=', value);
    if (this.cache) {
      this.cache.data[key] = value;
      this.cache.timestamp = Date.now(); // Refresh timestamp
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
      console.log('[SETTINGS-CACHE] Setting updated in cache successfully');
      
      // Emit change event when cache is manually updated
      console.log('[SETTINGS-CACHE] Emitting change event after manual cache update');
      this.emitChange(this.cache.data);
    } else {
      console.log('[SETTINGS-CACHE] No cache to update, triggering fresh fetch');
      this.getSettings();
    }
  }
}

export const settingsCacheService = SettingsCacheService.getInstance();
