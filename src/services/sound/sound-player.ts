import { logger } from '@/utils/logging';

class SoundPlayer {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof Audio !== 'undefined';
  }

  private async loadAudio(url: string, retries = 3): Promise<HTMLAudioElement | null> {
    if (!this.isSupported) {
      logger.debug('Audio not supported in this environment');
      return null;
    }

    try {
      // Check cache first
      if (this.audioCache.has(url)) {
        const cachedAudio = this.audioCache.get(url)!;
        // Test if cached audio is still valid
        try {
          await this.testAudioElement(cachedAudio);
          return cachedAudio;
        } catch {
          // Remove invalid cached audio
          this.audioCache.delete(url);
        }
      }

      const audio = new Audio();
      
      // Set properties before loading
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous'; // Handle CORS
      
      // Wait for audio to be ready with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Audio load timeout'));
        }, 10000); // 10 second timeout

        const onLoad = () => {
          cleanup();
          resolve(void 0);
        };
        
        const onError = (e: any) => {
          cleanup();
          reject(new Error(`Failed to load audio: ${e.message || 'Unknown error'}`));
        };

        const cleanup = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplaythrough', onLoad);
          audio.removeEventListener('loadeddata', onLoad);
          audio.removeEventListener('error', onError);
        };

        audio.addEventListener('canplaythrough', onLoad);
        audio.addEventListener('loadeddata', onLoad);
        audio.addEventListener('error', onError);
        
        // Set source after event listeners
        audio.src = url;
      });

      // Cache the audio
      this.audioCache.set(url, audio);
      
      return audio;
    } catch (error) {
      logger.error(`Failed to load audio (attempt ${4 - retries}):`, error);
      
      // Retry logic
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        return this.loadAudio(url, retries - 1);
      }
      
      return null;
    }
  }

  private async testAudioElement(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or better
        resolve();
        return;
      }
      
      const timeout = setTimeout(() => {
        reject(new Error('Audio test timeout'));
      }, 5000);

      const onReady = () => {
        clearTimeout(timeout);
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('loadeddata', onReady);
        resolve();
      };

      audio.addEventListener('canplaythrough', onReady);
      audio.addEventListener('loadeddata', onReady);
    });
  }

  async playSound(url: string, volume = 0.7): Promise<boolean> {
    if (!this.isSupported || !url) {
      logger.debug('Cannot play sound: not supported or no URL', { isSupported: this.isSupported, hasUrl: !!url });
      return false;
    }

    try {
      // Ensure audio context is active (mobile requirement)
      await this.ensureAudioContext();
      
      const audio = await this.loadAudio(url);
      if (!audio) {
        logger.warn('Failed to load audio for playback', { url });
        return false;
      }

      // Set volume and play
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.currentTime = 0; // Reset to beginning
      
      // Handle play promise (required for modern browsers)
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      logger.debug('Sound played successfully', { url, volume });
      return true;
    } catch (error) {
      logger.error('Failed to play sound:', error, { url, volume });
      return false;
    }
  }

  private async ensureAudioContext(): Promise<void> {
    try {
      // Create a dummy audio context to ensure it's unlocked
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      audioContext.close();
    } catch (error) {
      // Audio context not available or already active
      logger.debug('Audio context check:', error);
    }
  }

  async testSound(file: File, volume = 0.7): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      
      audio.volume = Math.max(0, Math.min(1, volume));
      
      await new Promise((resolve, reject) => {
        const onLoad = () => {
          audio.removeEventListener('canplaythrough', onLoad);
          audio.removeEventListener('error', onError);
          resolve(void 0);
        };
        
        const onError = () => {
          audio.removeEventListener('canplaythrough', onLoad);
          audio.removeEventListener('error', onError);
          reject(new Error('Invalid audio file'));
        };

        audio.addEventListener('canplaythrough', onLoad);
        audio.addEventListener('error', onError);
      });

      await audio.play();
      
      // Cleanup
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      logger.error('Failed to test sound:', error);
      return false;
    }
  }

  clearCache(): void {
    this.audioCache.clear();
  }

  isAudioSupported(): boolean {
    return this.isSupported;
  }
}

export const soundPlayer = new SoundPlayer();