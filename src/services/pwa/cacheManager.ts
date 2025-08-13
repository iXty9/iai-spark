import { logger } from '@/utils/logging';

export interface CacheBustingConfig {
  enabled: boolean;
  mode: 'development' | 'production';
  aggressiveInvalidation: boolean;
}

class CacheManager {
  private config: CacheBustingConfig;

  constructor() {
    this.config = {
      enabled: true,
      mode: import.meta.env.DEV ? 'development' : 'production',
      aggressiveInvalidation: !import.meta.env.DEV
    };
  }

  /**
   * Add cache-busting parameters to URLs
   */
  bustUrl(url: string, forceRefresh = false): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      
      if (this.config.enabled || forceRefresh) {
        const bustParam = this.config.mode === 'development' 
          ? Date.now().toString()
          : this.getBuildHash();
        
        urlObj.searchParams.set('v', bustParam);
        
        if (this.config.aggressiveInvalidation || forceRefresh) {
          urlObj.searchParams.set('_cb', Math.random().toString(36).substr(2, 9));
        }
      }
      
      return urlObj.toString();
    } catch (error) {
      logger.warn('URL cache busting failed', error, { module: 'cache-manager' });
      return url;
    }
  }

  /**
   * Create fetch with cache-busting headers
   */
  createCacheBustedFetch() {
    return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers);
      
      if (this.config.aggressiveInvalidation) {
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        headers.set('Pragma', 'no-cache');
        headers.set('Expires', '0');
      }
      
      // Add timestamp for cache busting
      const url = typeof input === 'string' ? input : input.toString();
      const bustedUrl = this.bustUrl(url);
      
      return fetch(bustedUrl, {
        ...init,
        headers
      });
    };
  }

  /**
   * Fetch critical resources with aggressive cache invalidation
   */
  async fetchCriticalResource(url: string): Promise<Response> {
    const bustedUrl = this.bustUrl(url, true);
    
    return fetch(bustedUrl, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  /**
   * Set cache headers for different resource types
   */
  getCacheHeaders(resourceType: 'html' | 'css' | 'js' | 'api' | 'assets'): HeadersInit {
    const baseHeaders: HeadersInit = {};

    switch (resourceType) {
      case 'html':
        return {
          ...baseHeaders,
          'Cache-Control': this.config.mode === 'production' 
            ? 'no-cache, must-revalidate' 
            : 'no-cache, no-store, must-revalidate'
        };
      
      case 'css':
      case 'js':
        return {
          ...baseHeaders,
          'Cache-Control': this.config.mode === 'production'
            ? 'public, max-age=300, must-revalidate' // 5 minutes with validation
            : 'no-cache, no-store, must-revalidate'
        };
      
      case 'api':
        return {
          ...baseHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        };
      
      case 'assets':
        return {
          ...baseHeaders,
          'Cache-Control': this.config.mode === 'production'
            ? 'public, max-age=86400' // 24 hours for static assets
            : 'no-cache'
        };
      
      default:
        return baseHeaders;
    }
  }

  /**
   * Get current build hash for cache busting
   */
  private getBuildHash(): string {
    try {
      const versionData = localStorage.getItem('ixty-app-version');
      if (versionData) {
        const version = JSON.parse(versionData);
        return version.buildHash || 'unknown';
      }
    } catch (error) {
      logger.warn('Failed to get build hash', error, { module: 'cache-manager' });
    }
    return Date.now().toString();
  }

  /**
   * Force reload with cache bypass
   */
  async forceReload(): Promise<void> {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Reload bypassing cache
      window.location.reload();
    } catch (error) {
      logger.error('Force reload failed', error, { module: 'cache-manager' });
      // Fallback to regular reload
      window.location.reload();
    }
  }

  /**
   * Check if aggressive cache invalidation should be enabled
   */
  shouldUseAggressiveInvalidation(): boolean {
    return this.config.aggressiveInvalidation;
  }
}

export const cacheManager = new CacheManager();