/**
 * Cache Invalidation Service
 * 
 * Provides utilities to invalidate Service Worker caches when data changes.
 * This ensures PWA and browser stay in sync when settings or other data is updated.
 */

import { logger } from '@/utils/logging';

class CacheInvalidationService {
  private static instance: CacheInvalidationService | null = null;

  static getInstance(): CacheInvalidationService {
    if (!this.instance) {
      this.instance = new CacheInvalidationService();
    }
    return this.instance;
  }

  /**
   * Invalidate cache entries matching the given URL patterns
   * @param patterns - Array of URL substrings to match (e.g., ['app_settings', '/rest/v1/profiles'])
   */
  async invalidateCache(patterns: string[]): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      logger.warn('Service worker not available, skipping cache invalidation', { module: 'cache-invalidation' });
      return false;
    }

    try {
      logger.info('Invalidating cache for patterns:', { patterns, module: 'cache-invalidation' });

      // Send message to service worker via MessageChannel for response
      const messageChannel = new MessageChannel();
      
      const responsePromise = new Promise<boolean>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            logger.info('Cache invalidation successful', { module: 'cache-invalidation' });
            resolve(true);
          } else {
            logger.error('Cache invalidation failed:', event.data.error, { module: 'cache-invalidation' });
            resolve(false);
          }
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          logger.warn('Cache invalidation timeout', { module: 'cache-invalidation' });
          resolve(false);
        }, 5000);
      });

      navigator.serviceWorker.controller.postMessage(
        {
          type: 'INVALIDATE_CACHE',
          patterns
        },
        [messageChannel.port2]
      );

      return await responsePromise;
    } catch (error) {
      logger.error('Cache invalidation error:', error, { module: 'cache-invalidation' });
      return false;
    }
  }

  /**
   * Invalidate app settings cache
   */
  async invalidateAppSettings(): Promise<boolean> {
    return this.invalidateCache(['app_settings', '/rest/v1/app_settings']);
  }

  /**
   * Invalidate user profile cache
   */
  async invalidateUserProfile(): Promise<boolean> {
    return this.invalidateCache(['profiles', '/rest/v1/profiles']);
  }

  /**
   * Invalidate theme cache
   */
  async invalidateTheme(): Promise<boolean> {
    return this.invalidateCache(['theme', 'profiles']);
  }

  /**
   * Clear all dynamic caches (aggressive invalidation)
   */
  async clearAllCaches(): Promise<boolean> {
    if (!('caches' in window)) {
      logger.warn('Cache API not available', { module: 'cache-invalidation' });
      return false;
    }

    try {
      const cacheNames = await caches.keys();
      const dynamicCaches = cacheNames.filter(name => name.includes('dynamic'));
      
      logger.info('Clearing all dynamic caches:', { caches: dynamicCaches, module: 'cache-invalidation' });
      
      await Promise.all(
        dynamicCaches.map(cacheName => caches.delete(cacheName))
      );

      logger.info('All dynamic caches cleared', { module: 'cache-invalidation' });
      return true;
    } catch (error) {
      logger.error('Failed to clear caches:', error, { module: 'cache-invalidation' });
      return false;
    }
  }
}

export const cacheInvalidationService = CacheInvalidationService.getInstance();
