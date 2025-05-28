
import { logger } from '@/utils/logging';
import { ThemeSettings } from '@/types/theme';

export interface BackgroundState {
  image: string | null;
  opacity: number;
  isLoaded: boolean;
  isApplied: boolean;
  lastError: string | null;
}

class BackgroundStateManager {
  private state: BackgroundState = {
    image: null,
    opacity: 0.5,
    isLoaded: false,
    isApplied: false,
    lastError: null
  };

  private listeners: Set<(state: BackgroundState) => void> = new Set();
  private retryCount = 0;
  private maxRetries = 3;

  getState(): BackgroundState {
    return { ...this.state };
  }

  subscribe(listener: (state: BackgroundState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  async loadFromProfile(themeSettings: string | null): Promise<void> {
    try {
      if (!themeSettings) {
        logger.info('No theme settings in profile, using defaults', { module: 'background-manager' });
        this.state = {
          image: null,
          opacity: 0.5,
          isLoaded: true,
          isApplied: false,
          lastError: null
        };
        this.notifyListeners();
        await this.applyToDOM();
        return;
      }

      const parsed: ThemeSettings = JSON.parse(themeSettings);
      const opacity = this.normalizeOpacity(parsed.backgroundOpacity);
      
      this.state = {
        image: parsed.backgroundImage || null,
        opacity,
        isLoaded: true,
        isApplied: false,
        lastError: null
      };

      logger.info('Background loaded from profile', { 
        module: 'background-manager',
        hasImage: !!this.state.image,
        opacity: this.state.opacity
      });

      this.notifyListeners();
      await this.applyToDOM();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to load background from profile:', error, { module: 'background-manager' });
      
      this.state.lastError = errorMessage;
      this.state.isLoaded = true;
      this.notifyListeners();
    }
  }

  updateImage(image: string | null): void {
    this.state.image = image;
    this.state.isApplied = false;
    this.notifyListeners();
    this.applyToDOM();
  }

  updateOpacity(opacity: number): void {
    this.state.opacity = this.normalizeOpacity(opacity);
    this.state.isApplied = false;
    this.notifyListeners();
    this.applyToDOM();
  }

  private normalizeOpacity(opacity: any): number {
    if (typeof opacity === 'string') {
      const parsed = parseFloat(opacity);
      return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
    }
    return Math.max(0, Math.min(1, opacity || 0.5));
  }

  private async applyToDOM(): Promise<void> {
    try {
      const root = document.documentElement;
      const body = document.body;

      if (this.state.image) {
        // Preload image to ensure it exists
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = this.state.image!;
        });

        // Apply background image
        root.style.setProperty('--bg-image-url', `url("${this.state.image}")`);
        root.style.setProperty('--bg-opacity', this.state.opacity.toString());
        
        body.style.backgroundImage = `url("${this.state.image}")`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundAttachment = 'fixed';
        body.style.backgroundRepeat = 'no-repeat';
        body.classList.add('with-bg-image');

        logger.info('Background image applied to DOM', { 
          module: 'background-manager',
          opacity: this.state.opacity
        });
      } else {
        // Remove background image
        root.style.removeProperty('--bg-image-url');
        root.style.setProperty('--bg-opacity', this.state.opacity.toString());
        
        body.style.backgroundImage = '';
        body.style.backgroundSize = '';
        body.style.backgroundPosition = '';
        body.style.backgroundAttachment = '';
        body.style.backgroundRepeat = '';
        body.classList.remove('with-bg-image');

        logger.info('Background image removed from DOM', { module: 'background-manager' });
      }

      this.state.isApplied = true;
      this.state.lastError = null;
      this.retryCount = 0;
      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to apply background to DOM:', error, { module: 'background-manager' });
      
      this.state.lastError = errorMessage;
      this.state.isApplied = false;
      this.notifyListeners();

      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`Retrying background application (${this.retryCount}/${this.maxRetries})`, { module: 'background-manager' });
        setTimeout(() => this.applyToDOM(), 1000 * this.retryCount);
      }
    }
  }

  createThemeSettings(): ThemeSettings {
    return {
      backgroundImage: this.state.image,
      backgroundOpacity: this.state.opacity,
      exportDate: new Date().toISOString()
    };
  }
}

export const backgroundStateManager = new BackgroundStateManager();
