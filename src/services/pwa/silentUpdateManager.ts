import { versionService } from './versionService';
import { logger } from '@/utils/logging';

/**
 * Manager for handling silent PWA updates for anonymous users
 * Simplified: just checks for updates and stores the new version
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
   * Performs silent update check for fresh anonymous users
   */
  async performSilentUpdateIfNeeded(): Promise<boolean> {
    if (this.isProcessing) {
      return false;
    }

    try {
      this.isProcessing = true;
      
      // Check if user is authenticated
      const hasAuth = localStorage.getItem('sb-supabase-auth-token') || 
                     sessionStorage.getItem('sb-supabase-auth-token');

      // Only do silent updates for anonymous users
      if (hasAuth) {
        return false;
      }

      // Check for updates
      const hasUpdate = await versionService.checkForUpdates();
      
      if (hasUpdate) {
        logger.info('Silent update detected for anonymous user', { module: 'silent-update' });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Silent update check failed:', error, { module: 'silent-update' });
      return false;
    } finally {
      this.isProcessing = false;
    }
  }
}

export const silentUpdateManager = SilentUpdateManager.getInstance();
