import { logger } from '@/utils/logging';

export interface AppVersion {
  version: string;
  buildTime: string;
  buildHash: string;
  environment?: string;
}

const VERSION_STORAGE_KEY = 'ixty-app-version';

class VersionService {
  private currentVersion: AppVersion | null = null;

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
      // Try static version.json with cache busting
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`/version.json${cacheBuster}`, { 
        cache: 'no-store',
        headers: { 
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Version fetch failed: ${response.status}`);
      }
      
      const version = await response.json();
      logger.info('Remote version fetched', { 
        buildHash: version.buildHash,
        environment: version.environment 
      }, { module: 'version-service' });
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
        currentVersion.buildHash !== remoteVersion.buildHash;

      if (hasUpdate) {
        logger.info('Update detected', { 
          current: currentVersion?.buildHash, 
          remote: remoteVersion.buildHash
        }, { module: 'version-service' });
        
        // Store the new version
        this.currentVersion = remoteVersion;
        localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(remoteVersion));
      }

      return hasUpdate;
    } catch (error) {
      logger.error('Update check failed', error, { module: 'version-service' });
      return false;
    }
  }

  /**
   * Force clear all caches and reload the app.
   * This is the nuclear option that always works.
   */
  async forceCacheRefresh(): Promise<void> {
    logger.info('Force cache refresh initiated', null, { module: 'version-service' });
    
    try {
      // 1. Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        logger.info('Browser caches cleared', { count: cacheNames.length }, { module: 'version-service' });
      }
      
      // 2. Tell service worker to clear its caches
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_ALL_CACHES' },
          [messageChannel.port2]
        );
      }
      
      // 3. Unregister all service workers to force re-download
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
        logger.info('Service workers unregistered', { count: registrations.length }, { module: 'version-service' });
      }
      
      // 4. Clear version from localStorage so it's treated as new
      localStorage.removeItem(VERSION_STORAGE_KEY);
      this.currentVersion = null;
      
      // 5. Clear sessionStorage
      sessionStorage.clear();
      
      // 6. Hard reload with cache bypass
      // Using location.href with cache buster ensures browser fetches fresh resources
      const url = new URL(window.location.href);
      url.searchParams.set('cache_bust', Date.now().toString());
      window.location.href = url.toString();
      
    } catch (error) {
      logger.error('Force cache refresh failed', error, { module: 'version-service' });
      // Fallback: simple reload
      window.location.reload();
    }
  }

  /**
   * Get the service worker's build hash for comparison
   */
  async getServiceWorkerVersion(): Promise<string | null> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data?.buildHash || null);
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
      
      // Timeout after 2 seconds
      setTimeout(() => resolve(null), 2000);
    });
  }
}

export const versionService = new VersionService();
