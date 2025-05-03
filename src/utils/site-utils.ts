
import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

/**
 * Sets the document title based on app settings
 */
export const applySiteTitle = async (): Promise<void> => {
  try {
    if (typeof document === 'undefined') {
      return; // Only run in browser environment
    }
    
    const appSettings = await fetchAppSettings();
    if (appSettings.site_title) {
      document.title = appSettings.site_title;
      logger.debug(`Applied site title: ${appSettings.site_title}`, null, { module: 'site' });
    }
  } catch (error) {
    logger.error('Failed to apply site title from settings', error, { module: 'site' });
  }
};
