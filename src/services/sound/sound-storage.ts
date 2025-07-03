import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { SoundUploadResult, SoundType } from '@/types/sound';

const SOUNDS_BUCKET = 'sounds';
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3'];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav'];

export class SoundStorageService {
  validateSoundFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, error: 'File size must be less than 1MB' };
    }

    // Check file type
    const isValidType = ALLOWED_TYPES.includes(file.type) || 
      ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      return { isValid: false, error: 'Only .mp3 and .wav files are allowed' };
    }

    return { isValid: true };
  }

  async uploadSound(
    file: File, 
    userId: string, 
    soundType: SoundType
  ): Promise<SoundUploadResult> {
    try {
      // Validate file
      const validation = this.validateSoundFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Generate file path
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const filePath = `${userId}/${soundType}.${fileExtension}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(SOUNDS_BUCKET)
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        logger.error('Error uploading sound file:', uploadError);
        return { success: false, error: 'Failed to upload sound file' };
      }

      // Get public URL
      const { data } = supabase.storage
        .from(SOUNDS_BUCKET)
        .getPublicUrl(filePath);

      logger.info('Sound file uploaded successfully', { 
        userId, 
        soundType, 
        filePath 
      });

      return { success: true, url: data.publicUrl };
    } catch (error) {
      logger.error('Unexpected error uploading sound:', error);
      return { success: false, error: 'Failed to upload sound file' };
    }
  }

  async deleteSound(userId: string, soundType: SoundType): Promise<boolean> {
    try {
      // Try both mp3 and wav extensions
      const extensions = ['mp3', 'wav'];
      let deleted = false;

      for (const ext of extensions) {
        const filePath = `${userId}/${soundType}.${ext}`;
        const { error } = await supabase.storage
          .from(SOUNDS_BUCKET)
          .remove([filePath]);

        if (!error) {
          deleted = true;
          logger.info('Sound file deleted successfully', { userId, soundType, filePath });
        }
      }

      return deleted;
    } catch (error) {
      logger.error('Error deleting sound file:', error);
      return false;
    }
  }

  getSoundUrl(userId: string, soundType: SoundType, extension = 'mp3'): string {
    const filePath = `${userId}/${soundType}.${extension}`;
    const { data } = supabase.storage
      .from(SOUNDS_BUCKET)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }
}

export const soundStorageService = new SoundStorageService();