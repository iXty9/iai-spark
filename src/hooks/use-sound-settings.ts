import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { soundService } from '@/services/sound/sound-service';
import { SoundSettings, SoundType } from '@/types/sound';
import { logger } from '@/utils/logging';

export function useSoundSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SoundSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState<SoundType | null>(null);

  // Initialize sound service and load settings
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        await soundService.initialize(user?.id);
        
        if (user?.id) {
          const userSettings = await soundService.getUserSettings(user.id);
          setSettings(userSettings);
        }
      } catch (error) {
        logger.error('Failed to initialize sound settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();
  }, [user?.id]);

  const updateSettings = useCallback(async (updates: Partial<SoundSettings>): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await soundService.updateUserSettings(user.id, updates);
      
      if (success) {
        const updatedSettings = await soundService.getUserSettings(user.id);
        setSettings(updatedSettings);
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to update sound settings:', error);
      return false;
    }
  }, [user?.id]);

  const uploadSound = useCallback(async (file: File, soundType: SoundType): Promise<boolean> => {
    if (!user?.id) return false;

    setIsUploading(true);
    setUploadingType(soundType);

    try {
      const success = await soundService.uploadSound(file, user.id, soundType);
      
      if (success) {
        const updatedSettings = await soundService.getUserSettings(user.id);
        setSettings(updatedSettings);
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to upload sound:', error);
      return false;
    } finally {
      setIsUploading(false);
      setUploadingType(null);
    }
  }, [user?.id]);

  const removeSound = useCallback(async (soundType: SoundType): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await soundService.removeSound(user.id, soundType);
      
      if (success) {
        const updatedSettings = await soundService.getUserSettings(user.id);
        setSettings(updatedSettings);
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to remove sound:', error);
      return false;
    }
  }, [user?.id]);

  const testSound = useCallback(async (file: File, volume?: number): Promise<boolean> => {
    try {
      return await soundService.testFile(file, volume || settings?.volume || 0.7);
    } catch (error) {
      logger.error('Failed to test sound:', error);
      return false;
    }
  }, [settings?.volume]);

  const validateFile = useCallback((file: File) => {
    return soundService.validateFile(file);
  }, []);

  const playTestSound = useCallback(async (soundType: SoundType): Promise<void> => {
    if (!user?.id) {
      logger.warn('Cannot play test sound: no user ID', { module: 'use-sound-settings' });
      return;
    }

    try {
      logger.info('Playing test sound', { soundType, userId: user.id, module: 'use-sound-settings' });
      
      // Ensure sound service is initialized
      await soundService.initialize(user.id);
      
      if (soundType === 'toast_notification') {
        const success = await soundService.playNotificationSound(user.id);
        logger.info('Test notification sound result', { success, soundType, userId: user.id, module: 'use-sound-settings' });
      } else {
        const success = await soundService.playChatMessageSound(user.id);
        logger.info('Test chat sound result', { success, soundType, userId: user.id, module: 'use-sound-settings' });
      }
    } catch (error) {
      logger.error('Failed to play test sound:', error, { soundType, userId: user.id, module: 'use-sound-settings' });
    }
  }, [user?.id]);

  return {
    settings,
    isLoading,
    isUploading,
    uploadingType,
    updateSettings,
    uploadSound,
    removeSound,
    testSound,
    validateFile,
    playTestSound
  };
}