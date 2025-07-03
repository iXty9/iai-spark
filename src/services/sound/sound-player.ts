import { logger } from '@/utils/logging';

class SoundPlayer {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof Audio !== 'undefined';
  }

  private async loadAudio(url: string): Promise<HTMLAudioElement | null> {
    if (!this.isSupported) {
      logger.debug('Audio not supported in this environment');
      return null;
    }

    try {
      // Check cache first
      if (this.audioCache.has(url)) {
        return this.audioCache.get(url)!;
      }

      const audio = new Audio(url);
      
      // Preload the audio
      audio.preload = 'auto';
      
      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        const onLoad = () => {
          audio.removeEventListener('canplaythrough', onLoad);
          audio.removeEventListener('error', onError);
          resolve(void 0);
        };
        
        const onError = () => {
          audio.removeEventListener('canplaythrough', onLoad);
          audio.removeEventListener('error', onError);
          reject(new Error('Failed to load audio'));
        };

        audio.addEventListener('canplaythrough', onLoad);
        audio.addEventListener('error', onError);
      });

      // Cache the audio
      this.audioCache.set(url, audio);
      
      return audio;
    } catch (error) {
      logger.error('Failed to load audio:', error);
      return null;
    }
  }

  async playSound(url: string, volume = 0.7): Promise<boolean> {
    if (!this.isSupported || !url) {
      return false;
    }

    try {
      const audio = await this.loadAudio(url);
      if (!audio) {
        return false;
      }

      // Set volume and play
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.currentTime = 0; // Reset to beginning
      
      await audio.play();
      
      logger.debug('Sound played successfully', { url, volume });
      return true;
    } catch (error) {
      logger.error('Failed to play sound:', error);
      return false;
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