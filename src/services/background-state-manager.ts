
import { logger } from '@/utils/logging';
import { ThemeSettings } from '@/types/theme';
import { supabase } from '@/integrations/supabase/client';

export interface BackgroundState {
  image: string | null;
  opacity: number;
  isLoaded: boolean;
  isApplied: boolean;
  lastError: string | null;
  isClientReady: boolean;
}

class BackgroundStateManager {
  private state: BackgroundState = {
    image: null,
    opacity: 0.5,
    isLoaded: false,
    isApplied: false,
    lastError: null,
    isClientReady: false
  };

  private listeners: Set<(state: BackgroundState) => void> = new Set();
  private retryCount = 0;
  private maxRetries = 3;
  private clientReadyPromise: Promise<boolean> | null = null;

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

  private async ensureClientReady(): Promise<boolean> {
    if (this.state.isClientReady) {
      return true;
    }

    if (this.clientReadyPromise) {
      return this.clientReadyPromise;
    }

    this.clientReadyPromise = this.checkClientReadiness();
    return this.clientReadyPromise;
  }

  private async checkClientReadiness(): Promise<boolean> {
    try {
      // Wait for client to be available
      let attempts = 0;
      const maxAttempts = 50;
      
      while (attempts < maxAttempts) {
        try {
          // Test if client is functional by making a simple auth call
          const { data, error } = await supabase.auth.getSession();
          
          if (error && error.message.includes('not available')) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            continue;
          }
          
          // Client is ready
          this.state.isClientReady = true;
          this.clientReadyPromise = null;
          logger.info('Supabase client ready for background manager', { module: 'background-manager' });
          return true;
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }
      
      throw new Error('Supabase client not ready after maximum attempts');
    } catch (error) {
      logger.error('Failed to ensure client readiness:', error, { module: 'background-manager' });
      this.state.isClientReady = false;
      this.clientReadyPromise = null;
      return false;
    }
  }

  async loadFromProfile(themeSettings: string | null): Promise<void> {
    try {
      // Ensure client is ready before proceeding
      const clientReady = await this.ensureClientReady();
      if (!clientReady) {
        logger.warn('Client not ready, using defaults', { module: 'background-manager' });
        this.state = {
          ...this.state,
          image: null,
          opacity: 0.5,
          isLoaded: true,
          isApplied: false,
          lastError: 'Supabase client not ready'
        };
        this.notifyListeners();
        return;
      }

      if (!themeSettings) {
        logger.info('No theme settings in profile, using defaults', { module: 'background-manager' });
        this.state = {
          ...this.state,
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
        ...this.state,
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

        // Apply background image with improved CSS approach
        root.style.setProperty('--bg-image-url', `url("${this.state.image}")`);
        root.style.setProperty('--bg-opacity', this.state.opacity.toString());
        
        // Use more reliable CSS implementation
        body.style.setProperty('background-image', `url("${this.state.image}")`, 'important');
        body.style.setProperty('background-size', 'cover', 'important');
        body.style.setProperty('background-position', 'center', 'important');
        body.style.setProperty('background-attachment', 'fixed', 'important');
        body.style.setProperty('background-repeat', 'no-repeat', 'important');
        body.classList.add('with-bg-image');

        logger.info('Background image applied to DOM', { 
          module: 'background-manager',
          opacity: this.state.opacity
        });
      } else {
        // Remove background image completely
        root.style.removeProperty('--bg-image-url');
        root.style.setProperty('--bg-opacity', this.state.opacity.toString());
        
        body.style.removeProperty('background-image');
        body.style.removeProperty('background-size');
        body.style.removeProperty('background-position');
        body.style.removeProperty('background-attachment');
        body.style.removeProperty('background-repeat');
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
