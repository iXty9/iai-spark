import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { SoundSettings, SoundType, DefaultSoundSettings } from '@/types/sound';
import { soundPlayer } from './sound-player';
import { soundStorageService } from './sound-storage';
import { getAppSettingsMap } from '@/services/admin/settings/generalSettings';

class SoundService {
  private settings: SoundSettings | null = null;
  private defaultSettings: DefaultSoundSettings | null = null;
  private isInitialized = false;

  async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load default settings
      await this.loadDefaultSettings();

      // Load user settings if authenticated
      if (userId) {
        await this.loadUserSettings(userId);
      }

      this.isInitialized = true;
      logger.info('Sound service initialized', { 
        hasUserSettings: !!this.settings,
        hasDefaultSettings: !!this.defaultSettings
      });
    } catch (error) {
      logger.error('Failed to initialize sound service:', error);
    }
  }

  private async loadDefaultSettings(): Promise<void> {
    try {
      const appSettings = await getAppSettingsMap();
      const defaultSoundSettings = appSettings['default_sound_settings'];
      
      if (defaultSoundSettings) {
        this.defaultSettings = JSON.parse(defaultSoundSettings);
      } else {
        // Set fallback defaults
        this.defaultSettings = {
          sounds_enabled: true,
          volume: 0.7
        };
      }
    } catch (error) {
      logger.error('Failed to load default sound settings:', error);
      this.defaultSettings = {
        sounds_enabled: true,
        volume: 0.7
      };
    }
  }

  private async loadUserSettings(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('sound_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Error loading user sound settings:', error);
        return;
      }

      this.settings = data;
    } catch (error) {
      logger.error('Failed to load user sound settings:', error);
    }
  }

  async getUserSettings(userId: string): Promise<SoundSettings> {
    if (!this.settings || this.settings.user_id !== userId) {
      await this.loadUserSettings(userId);
    }

    // Return user settings or defaults
    return this.settings || {
      user_id: userId,
      sounds_enabled: this.defaultSettings?.sounds_enabled ?? true,
      volume: this.defaultSettings?.volume ?? 0.7,
      toast_notification_sound: this.defaultSettings?.toast_notification_sound,
      chat_message_sound: this.defaultSettings?.chat_message_sound
    };
  }

  async updateUserSettings(
    userId: string, 
    updates: Partial<SoundSettings>
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('sound_settings')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error updating sound settings:', error);
        return false;
      }

      this.settings = data;
      logger.info('Sound settings updated successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to update sound settings:', error);
      return false;
    }
  }

  async playNotificationSound(userId?: string): Promise<void> {
    if (!userId) return;

    try {
      const settings = await this.getUserSettings(userId);
      
      if (!settings.sounds_enabled) return;

      const soundUrl = settings.toast_notification_sound || 
        this.defaultSettings?.toast_notification_sound;

      if (soundUrl) {
        await soundPlayer.playSound(soundUrl, settings.volume);
      }
    } catch (error) {
      logger.error('Failed to play notification sound:', error);
    }
  }

  async playChatMessageSound(userId?: string): Promise<void> {
    if (!userId) return;

    try {
      const settings = await this.getUserSettings(userId);
      
      if (!settings.sounds_enabled) return;

      const soundUrl = settings.chat_message_sound || 
        this.defaultSettings?.chat_message_sound;

      if (soundUrl) {
        await soundPlayer.playSound(soundUrl, settings.volume);
      }
    } catch (error) {
      logger.error('Failed to play chat message sound:', error);
    }
  }

  async uploadSound(
    file: File, 
    userId: string, 
    soundType: SoundType
  ): Promise<boolean> {
    try {
      const result = await soundStorageService.uploadSound(file, userId, soundType);
      
      if (!result.success) {
        logger.error('Sound upload failed:', result.error);
        return false;
      }

      // Update user settings with new sound URL
      const updateData = {
        [soundType === 'toast_notification' ? 'toast_notification_sound' : 'chat_message_sound']: result.url
      };

      return await this.updateUserSettings(userId, updateData);
    } catch (error) {
      logger.error('Failed to upload sound:', error);
      return false;
    }
  }

  async removeSound(userId: string, soundType: SoundType): Promise<boolean> {
    try {
      // Delete from storage
      await soundStorageService.deleteSound(userId, soundType);

      // Update user settings to remove sound URL
      const updateData = {
        [soundType === 'toast_notification' ? 'toast_notification_sound' : 'chat_message_sound']: null
      };

      return await this.updateUserSettings(userId, updateData);
    } catch (error) {
      logger.error('Failed to remove sound:', error);
      return false;
    }
  }

  validateFile(file: File): { isValid: boolean; error?: string } {
    return soundStorageService.validateSoundFile(file);
  }

  async testFile(file: File, volume = 0.7): Promise<boolean> {
    return await soundPlayer.testSound(file, volume);
  }

  getDefaultSettings(): DefaultSoundSettings | null {
    return this.defaultSettings;
  }

  async setDefaultSettings(settings: DefaultSoundSettings): Promise<boolean> {
    try {
      const { updateAppSetting } = await import('@/services/admin/settings/generalSettings');
      const success = await updateAppSetting('default_sound_settings', JSON.stringify(settings));
      
      if (success) {
        this.defaultSettings = settings;
        logger.info('Default sound settings updated');
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to set default sound settings:', error);
      return false;
    }
  }
}

export const soundService = new SoundService();