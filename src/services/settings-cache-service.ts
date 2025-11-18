

import { fetchAppSettings } from '@/services/admin/settingsService';
import { clientManager } from '@/services/supabase/client-manager';

interface CachedSettings {
  data: Record<string, string>;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  context: 'application' | 'anonymous' | 'authenticated' | 'unknown';
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
  private lastCacheContext: 'application' | 'anonymous' | 'authenticated' | 'unknown' = 'unknown';

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

  private saveToLocalStorage(settings: Record<string, string>, context: 'application' | 'anonymous' | 'authenticated' | 'unknown' = 'unknown'): void {
    try {
      const cacheData: CachedSettings = {
        data: settings,
        timestamp: Date.now(),
        ttl: this.DEFAULT_TTL,
        context
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      this.cache = cacheData;
      this.lastCacheContext = context;
      
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

  /**
   * Get settings from cache or fetch from backend
   * Context-aware to prevent cache poisoning across auth state changes
   */
  async getSettings(isAuthenticated?: boolean): Promise<Record<string, string>> {
    // Determine current context
    const currentContext = this.determineContext(isAuthenticated);

    // Check if we have a valid cache AND it matches the current context
    if (
      this.cache && 
      this.isCacheValid(this.cache) &&
      this.cache.context === currentContext
    ) {
      // Emit change event with a small delay to ensure hooks are ready
      setTimeout(() => {
        this.emitChange(this.cache!.data);
      }, 10);
      
      return this.cache.data;
    }

    // If context changed, invalidate cache
    if (this.cache && this.cache.context !== currentContext) {
      if (shouldLog('info')) console.log(`[SETTINGS-CACHE] Auth context changed from ${this.cache.context} to ${currentContext}, invalidating cache`);
      this.cache = null;
    }

    // If already fetching, return the existing promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Start new fetch with client readiness check
    this.fetchPromise = this.fetchAndCacheSettings(currentContext);
    
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

  /**
   * Determine the current context based on authentication state
   */
  private determineContext(isAuthenticated?: boolean): 'application' | 'anonymous' | 'authenticated' | 'unknown' {
    if (isAuthenticated === undefined) {
      return 'unknown';
    }
    return isAuthenticated ? 'authenticated' : 'anonymous';
  }

  /**
   * Fetch settings from backend and cache them with context tracking
   */
  private async fetchAndCacheSettings(context: 'application' | 'anonymous' | 'authenticated' | 'unknown'): Promise<Record<string, string>> {
    // Step 1: Check if client is ready
    const clientReady = await this.waitForClientReady();
    if (!clientReady) {
      if (shouldLog('warn')) console.warn('[SETTINGS-CACHE] Client not ready, using fallback settings');
      return this.getFallbackSettings();
    }
    
    try {
      const settings = await fetchAppSettings();
      if (shouldLog()) console.log(`[SETTINGS-CACHE] Settings loaded successfully for context: ${context}`);
      this.saveToLocalStorage(settings, context);
      return settings;
    } catch (error) {
      // Improved error logging with RLS context
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRLSError = errorMessage.toLowerCase().includes('policy') || 
                        errorMessage.toLowerCase().includes('permission');
      
      if (isRLSError) {
        console.warn('[SETTINGS-CACHE] RLS policy may be restricting access for anonymous users:', {
          error: errorMessage,
          note: 'Some settings may not be visible. Check RLS policies on app_settings table.'
        });
      } else {
        console.error('[SETTINGS-CACHE] Failed to fetch settings from database:', error);
      }
      
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
      app_name: 'The Everywhere Intelligent Assistant',
      show_ai_in_menu: 'true'
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

  async invalidateCache(): Promise<void> {
    if (shouldLog('info')) {
      console.log('[SETTINGS-CACHE] Cache invalidated');
    }
    this.cache = null;
    this.fetchPromise = null;
    try {
      localStorage.removeItem(this.CACHE_KEY);
      
      // Also invalidate Service Worker cache for PWA sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const { cacheInvalidationService } = await import('@/services/pwa/cache-invalidation-service');
        await cacheInvalidationService.invalidateAppSettings();
      }
    } catch (error) {
      console.error('[SETTINGS-CACHE] Failed to remove cache from localStorage:', error);
    }
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

