import { versionService } from './versionService';
import { logger } from '@/utils/logging';

/**
 * Manager for handling silent PWA updates for anonymous users
 */
class SilentUpdateManager {
  private static instance: SilentUpdateManager | null = null;
  private isProcessing = false;

  static getInstance(): SilentUpdateManager {
    if (!this.instance) {
      this.instance = new SilentUpdateManager();
    }
    return this.instance;
  }

  /**
   * Performs silent update check and application for fresh anonymous users
   */
  async performSilentUpdateIfNeeded(): Promise<boolean> {
    if (this.isProcessing) {
      return false;
    }

    try {
      this.isProcessing = true;
      
      // Only check for updates if this is a fresh browser load
      const currentVersion = await versionService.getCurrentVersion();
      const remoteVersion = await versionService.fetchRemoteVersion();
      
      if (!currentVersion || !remoteVersion) {
        return false;
      }

      // Check if we should perform silent update
      if (this.shouldPerformSilentUpdate(currentVersion, remoteVersion)) {
        logger.info('Performing silent update for fresh anonymous user', {
          module: 'silent-update',
          from: currentVersion.buildHash,
          to: remoteVersion.buildHash
        });

        // Update version without notification
        await versionService.updateToVersion(remoteVersion);
        
        // Clean up caches silently
        await this.silentCacheCleanup();
        
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Silent update failed:', error, { module: 'silent-update' });
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  private shouldPerformSilentUpdate(current: any, remote: any): boolean {
    // Only in production environment
    if (remote.environment !== 'production') {
      return false;
    }

    // Check if this is a fresh browser (no stored version)
    const storedVersion = localStorage.getItem('app_version');
    
    // Check if user is authenticated
    const hasAuth = localStorage.getItem('sb-supabase-auth-token') || 
                   sessionStorage.getItem('sb-supabase-auth-token');

    // Silent update conditions:
    // 1. Fresh browser load (no stored version)
    // 2. User is not authenticated  
    // 3. Versions are different
    return !storedVersion && !hasAuth && current.buildHash !== remote.buildHash;
  }

  private async silentCacheCleanup(): Promise<void> {
    try {
      // Clear only non-essential caches to avoid disrupting user experience
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const oldCacheNames = cacheNames.filter(name => 
          name.includes('ixty-ai') && !name.includes('user-data')
        );
        
        await Promise.all(
          oldCacheNames.map(name => caches.delete(name))
        );
      }

      // Clear session storage but preserve user preferences
      const preserveKeys = ['theme_preferences', 'user_settings'];
      const sessionKeys = Object.keys(sessionStorage);
      
      sessionKeys.forEach(key => {
        if (!preserveKeys.some(preserve => key.includes(preserve))) {
          sessionStorage.removeItem(key);
        }
      });

      logger.info('Silent cache cleanup completed', { module: 'silent-update' });
    } catch (error) {
      logger.error('Silent cache cleanup failed:', error, { module: 'silent-update' });
    }
  }
}

export const silentUpdateManager = SilentUpdateManager.getInstance();