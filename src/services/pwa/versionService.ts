
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

const VERSION_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const VERSION_STORAGE_KEY = 'ixty-app-version';

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
      this.currentVersion = version;
      localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(version));
      logger.info('Version updated', { version: version.buildHash }, { module: 'version-service' });
    } catch (error) {
      logger.error('Failed to update version', error, { module: 'version-service' });
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
