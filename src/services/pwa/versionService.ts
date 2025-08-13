
import { logger } from '@/utils/logging';

export interface AppVersion {
  version: string;
  buildTime: string;
  buildHash: string;
  cacheNames: {
    static: string;
    dynamic: string;
  };
}

export interface CacheCleanupConfig {
  clearAll?: boolean;
  preserveKeys?: string[];
  clearPrefixes?: string[];
}

const VERSION_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const VERSION_STORAGE_KEY = 'ixty-app-version';
const LAST_CLEANUP_KEY = 'last-cache-cleanup';

// Keys to preserve during cache cleanup (user preferences)
const PRESERVE_KEYS = [
  'theme-preferences',
  'user-settings',
  'notification-preferences',
  'sound-settings',
  'location-permissions'
];

// Prefixes to clear during version changes (configuration caches)
const CLEAR_PREFIXES = [
  'supabase_',
  'config_',
  'bootstrap_',
  'cache_',
  'temp_'
];

class VersionService {
  private currentVersion: AppVersion | null = null;
  private checkTimer: NodeJS.Timeout | null = null;
  private listeners: ((hasUpdate: boolean) => void)[] = [];

  async getCurrentVersion(): Promise<AppVersion | null> {
    if (this.currentVersion) return this.currentVersion;
    
    try {
      const stored = localStorage.getItem(VERSION_STORAGE_KEY);
      if (stored) {
        this.currentVersion = JSON.parse(stored);
      }
    } catch (error) {
      logger.warn('Failed to load stored version', error, { module: 'version-service' });
    }
    
    return this.currentVersion;
  }

  async fetchRemoteVersion(): Promise<AppVersion | null> {
    try {
      const response = await fetch('/version.json', { 
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Version fetch failed: ${response.status}`);
      }
      
      const version = await response.json();
      logger.info('Remote version fetched', { version }, { module: 'version-service' });
      return version;
    } catch (error) {
      logger.error('Failed to fetch remote version', error, { module: 'version-service' });
      return null;
    }
  }

  async checkForUpdates(): Promise<boolean> {
    try {
      const [currentVersion, remoteVersion] = await Promise.all([
        this.getCurrentVersion(),
        this.fetchRemoteVersion()
      ]);

      if (!remoteVersion) return false;
      
      const hasUpdate = !currentVersion || 
        currentVersion.buildHash !== remoteVersion.buildHash ||
        currentVersion.buildTime !== remoteVersion.buildTime;

      if (hasUpdate) {
        logger.info('Update detected', { 
          current: currentVersion?.buildHash, 
          remote: remoteVersion.buildHash 
        }, { module: 'version-service' });
        
        this.notifyListeners(true);
      }

      return hasUpdate;
    } catch (error) {
      logger.error('Update check failed', error, { module: 'version-service' });
      return false;
    }
  }

  async updateToVersion(version: AppVersion): Promise<void> {
    try {
      const oldVersion = this.currentVersion;
      this.currentVersion = version;
      localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(version));
      
      // Perform cache cleanup if this is a version change
      if (oldVersion && oldVersion.buildHash !== version.buildHash) {
        await this.performCacheCleanup();
      }
      
      logger.info('Version updated', { 
        from: oldVersion?.buildHash, 
        to: version.buildHash 
      }, { module: 'version-service' });
    } catch (error) {
      logger.error('Failed to update version', error, { module: 'version-service' });
    }
  }

  async performCacheCleanup(config: CacheCleanupConfig = {}): Promise<void> {
    try {
      const { clearAll = false, preserveKeys = PRESERVE_KEYS, clearPrefixes = CLEAR_PREFIXES } = config;
      
      if (clearAll) {
        // Clear everything except preserved keys
        const keysToPreserve: Record<string, string> = {};
        preserveKeys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) keysToPreserve[key] = value;
        });
        
        localStorage.clear();
        
        // Restore preserved keys
        Object.entries(keysToPreserve).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      } else {
        // Clear by prefixes
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && clearPrefixes.some(prefix => key.startsWith(prefix))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      // Clear session storage (temporary data)
      sessionStorage.clear();
      
      // Mark cleanup as completed
      localStorage.setItem(LAST_CLEANUP_KEY, Date.now().toString());
      
      logger.info('Cache cleanup completed', { 
        strategy: clearAll ? 'clear-all' : 'selective',
        preservedKeys: preserveKeys.length,
        clearedPrefixes: clearPrefixes.length
      }, { module: 'version-service' });
    } catch (error) {
      logger.error('Cache cleanup failed', error, { module: 'version-service' });
    }
  }

  async forceCacheRefresh(): Promise<void> {
    try {
      // Clear browser HTTP cache for critical resources
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
        logger.info('Browser caches cleared', { cacheNames }, { module: 'version-service' });
      }
      
      // Perform local storage cleanup
      await this.performCacheCleanup({ clearAll: true });
      
      // Reload with cache bypass
      window.location.reload();
    } catch (error) {
      logger.error('Force cache refresh failed', error, { module: 'version-service' });
    }
  }

  startPeriodicChecks(): void {
    this.stopPeriodicChecks();
    
    // Check immediately
    this.checkForUpdates();
    
    // Check every 30 minutes
    this.checkTimer = setInterval(() => {
      this.checkForUpdates();
    }, VERSION_CHECK_INTERVAL);

    // Check when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });

    // Check when network comes back online
    window.addEventListener('online', () => {
      this.checkForUpdates();
    });

    logger.info('Periodic version checks started', null, { module: 'version-service' });
  }

  stopPeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  onUpdateAvailable(callback: (hasUpdate: boolean) => void): void {
    this.listeners.push(callback);
  }

  private notifyListeners(hasUpdate: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(hasUpdate);
      } catch (error) {
        logger.error('Update listener error', error, { module: 'version-service' });
      }
    });
  }
}

export const versionService = new VersionService();
