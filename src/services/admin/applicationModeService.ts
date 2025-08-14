import { fetchAppSettings, updateAppSetting } from './settingsService';
import { logger } from '@/utils/logging';

export type ApplicationMode = 'development' | 'production';

class ApplicationModeService {
  private cachedMode: ApplicationMode | null = null;
  private isLoading = false;

  /**
   * Get the current application mode from database cache or fetch it
   */
  async getApplicationMode(): Promise<ApplicationMode> {
    if (this.cachedMode) {
      return this.cachedMode;
    }

    if (this.isLoading) {
      // Wait for existing request to complete
      return new Promise((resolve) => {
        const checkCached = () => {
          if (this.cachedMode || !this.isLoading) {
            resolve(this.cachedMode || 'production');
          } else {
            setTimeout(checkCached, 50);
          }
        };
        checkCached();
      });
    }

    this.isLoading = true;
    
    try {
      const settings = await fetchAppSettings();
      const mode = settings.application_mode as ApplicationMode || 'production';
      this.cachedMode = mode;
      
      logger.info('Application mode loaded', { mode }, { module: 'application-mode' });
      return mode;
    } catch (error) {
      logger.error('Failed to fetch application mode, defaulting to production', error, { module: 'application-mode' });
      this.cachedMode = 'production';
      return 'production';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Set the application mode and update database
   */
  async setApplicationMode(mode: ApplicationMode): Promise<void> {
    try {
      await updateAppSetting('application_mode', mode);
      this.cachedMode = mode;
      
      logger.info('Application mode updated', { mode }, { module: 'application-mode' });
      
      // Dispatch event for other parts of the app to react
      window.dispatchEvent(new CustomEvent('applicationModeChanged', { 
        detail: { mode } 
      }));
    } catch (error) {
      logger.error('Failed to update application mode', error, { module: 'application-mode' });
      throw error;
    }
  }

  /**
   * Check if the application is in development mode
   */
  async isApplicationInDevelopmentMode(): Promise<boolean> {
    const mode = await this.getApplicationMode();
    return mode === 'development';
  }

  /**
   * Check if the application is in production mode
   */
  async isApplicationInProductionMode(): Promise<boolean> {
    const mode = await this.getApplicationMode();
    return mode === 'production';
  }

  /**
   * Clear the cached mode (useful for testing or force refresh)
   */
  clearCache(): void {
    this.cachedMode = null;
  }
}

// Export singleton instance
export const applicationModeService = new ApplicationModeService();

// Helper functions for easy access
export const getApplicationMode = () => applicationModeService.getApplicationMode();
export const setApplicationMode = (mode: ApplicationMode) => applicationModeService.setApplicationMode(mode);
export const isApplicationInDevelopmentMode = () => applicationModeService.isApplicationInDevelopmentMode();
export const isApplicationInProductionMode = () => applicationModeService.isApplicationInProductionMode();