
import { settingsCacheService } from '@/services/settings-cache-service';
import { logger } from '@/utils/logging';

interface AvatarCache {
  [url: string]: {
    loaded: boolean;
    error: boolean;
    element?: HTMLImageElement;
  };
}

class AvatarCacheService {
  private static instance: AvatarCacheService | null = null;
  private cache: AvatarCache = {};
  private preloadQueue: Set<string> = new Set();

  static getInstance(): AvatarCacheService {
    if (!this.instance) {
      this.instance = new AvatarCacheService();
    }
    return this.instance;
  }

  private constructor() {
    this.initializeAvatarPreloading();
  }

  private async initializeAvatarPreloading(): Promise<void> {
    try {
      const settings = await settingsCacheService.getSettings();
      const avatarUrls = [
        settings.default_avatar_url,
        settings.avatar_url,
        'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png' // Hardcoded Ixty icon
      ].filter(Boolean);

      avatarUrls.forEach(url => this.preloadImage(url));
    } catch (error) {
      logger.warn('Failed to initialize avatar preloading:', error, { module: 'avatar-cache' });
    }
  }

  preloadImage(url: string): Promise<void> {
    if (!url || this.cache[url] || this.preloadQueue.has(url)) {
      return Promise.resolve();
    }

    this.preloadQueue.add(url);
    
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache[url] = { loaded: true, error: false, element: img };
        this.preloadQueue.delete(url);
        logger.info(`Avatar preloaded successfully: ${url}`, { module: 'avatar-cache' });
        resolve();
      };
      
      img.onerror = () => {
        this.cache[url] = { loaded: false, error: true };
        this.preloadQueue.delete(url);
        logger.warn(`Avatar preload failed: ${url}`, { module: 'avatar-cache' });
        resolve(); // Resolve anyway to not block other operations
      };

      img.src = url;
    });
  }

  isImageLoaded(url: string): boolean {
    return this.cache[url]?.loaded || false;
  }

  hasImageError(url: string): boolean {
    return this.cache[url]?.error || false;
  }

  getImageElement(url: string): HTMLImageElement | undefined {
    return this.cache[url]?.element;
  }

  preloadAvatarsFromSettings(): void {
    settingsCacheService.getSettings().then(settings => {
      const avatarUrls = [
        settings.default_avatar_url,
        settings.avatar_url
      ].filter(Boolean);

      avatarUrls.forEach(url => this.preloadImage(url));
    });
  }
}

export const avatarCacheService = AvatarCacheService.getInstance();
