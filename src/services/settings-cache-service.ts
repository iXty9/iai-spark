

import { fetchAppSettings } from '@/services/admin/settingsService';
import { clientManager } from '@/services/supabase/client-manager';

interface CachedSettings {
  data: Record<string, string>;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

type SettingsChangeListener = (settings: Record<string, string>) => void;

// Simple logging control - only log in development or when explicitly enabled
const isDev = import.meta.env.DEV;
const shouldLog = (level: 'error' | 'warn' | 'info' = 'info') => {
  if (level === 'error' || level === 'warn') return true;
  return isDev;
};

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
    try {
      this.loadFromLocalStorage();
    } catch (error) {
      console.error('[SETTINGS-CACHE] Constructor error:', error);
    }
  }

  // Add listener for settings changes
  addChangeListener(listener: SettingsChangeListener): () => void {
    this.listeners.add(listener);
    
    // If we have valid cached data, immediately notify the new listener
    if (this.cache && this.isCacheValid(this.cache)) {
      setTimeout(() => {
        try {
          listener(this.cache!.data);
        } catch (error) {
          console.error('[SETTINGS-CACHE] Error in immediate listener notification:', error);
        }
      }, 0);
    }
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Emit settings change event
  private emitChange(settings: Record<string, string>): void {
    this.listeners.forEach((listener) => {
      try {
        listener(settings);
      } catch (error) {
        console.error('[SETTINGS-CACHE] Error in settings change listener:', error);
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
          
          // Emit change event for valid cached data on initial load
          setTimeout(() => {
            this.emitChange(parsedCache.data);
          }, 0);
        } else {
          localStorage.removeItem(this.CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('[SETTINGS-CACHE] Failed to load settings from localStorage:', error);
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
      
      // Emit change event when cache is updated with fresh data
      this.emitChange(settings);
    } catch (error) {
      console.error('[SETTINGS-CACHE] Failed to save settings to localStorage:', error);
    }
  }

  // Check if client is ready before making database calls
  private async waitForClientReady(): Promise<boolean> {
    try {
      const isReady = await clientManager.waitForReadiness();
      if (!isReady) {
        console.warn('[SETTINGS-CACHE] Client not ready after timeout');
        return false;
      }
      return true;
    } catch (error) {
      console.error('[SETTINGS-CACHE] Error waiting for client readiness:', error);
      return false;
    }
  }

  async getSettings(): Promise<Record<string, string>> {
    // Return cached data if valid
    if (this.cache && this.isCacheValid(this.cache)) {
      // Emit change event with a small delay to ensure hooks are ready
      setTimeout(() => {
        this.emitChange(this.cache!.data);
      }, 10);
      
      return this.cache.data;
    }

    // If already fetching, return the existing promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Start new fetch with client readiness check
    this.fetchPromise = this.fetchAndCacheSettings();
    
    try {
      const settings = await this.fetchPromise;
      return settings;
    } catch (error) {
      console.error('[SETTINGS-CACHE] Fresh settings fetch failed:', error);
      throw error;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async fetchAndCacheSettings(): Promise<Record<string, string>> {
    // Step 1: Check if client is ready
    const clientReady = await this.waitForClientReady();
    if (!clientReady) {
      if (shouldLog('warn')) console.warn('[SETTINGS-CACHE] Client not ready, using fallback settings');
      return this.getFallbackSettings();
    }
    
    try {
      const settings = await fetchAppSettings();
      if (shouldLog()) console.log('[SETTINGS-CACHE] Settings loaded successfully');
      this.saveToLocalStorage(settings);
      return settings;
    } catch (error) {
      console.error('[SETTINGS-CACHE] Failed to fetch settings from database:', error);
      
      // Return cached data even if expired as fallback
      if (this.cache) {
        return this.cache.data;
      }
      
      // Return fallback settings as final option
      return this.getFallbackSettings();
    }
  }

  private getFallbackSettings(): Record<string, string> {
    const fallbackSettings = {
      ai_agent_name: 'AI Assistant',
      app_name: 'The Everywhere Intelligent Assistant'
    };
    
    // Emit change event with fallback data to unblock hooks
    setTimeout(() => {
      this.emitChange(fallbackSettings);
    }, 0);
    
    return fallbackSettings;
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
  }

  // Method to update cache when settings are changed in admin panel
  updateCache(key: string, value: string): void {
    if (this.cache) {
      this.cache.data[key] = value;
      this.cache.timestamp = Date.now(); // Refresh timestamp
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
      
      // Emit change event when cache is manually updated
      this.emitChange(this.cache.data);
    } else {
      this.getSettings();
    }
  }
}

export const settingsCacheService = SettingsCacheService.getInstance();

