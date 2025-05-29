
import { supabase } from '@/integrations/supabase/client';
import { validateFileSecurely } from '@/utils/security';
import { logger } from '@/utils/logging';

const AVATAR_OPTIONS = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  maxDimensions: { width: 1024, height: 1024 }
};

export interface AvatarUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Validates and uploads an avatar image
 */
export async function uploadAvatar(file: File, userId: string): Promise<AvatarUploadResult> {
  try {
    // Validate file
    const validationError = validateFileSecurely(file, AVATAR_OPTIONS);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Check image dimensions
    const dimensions = await getImageDimensions(file);
    if (dimensions.width > AVATAR_OPTIONS.maxDimensions.width || 
        dimensions.height > AVATAR_OPTIONS.maxDimensions.height) {
      return { 
        success: false, 
        error: `Image too large. Maximum dimensions: ${AVATAR_OPTIONS.maxDimensions.width}x${AVATAR_OPTIONS.maxDimensions.height}px` 
      };
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      logger.error('Avatar upload error:', uploadError);
      return { success: false, error: 'Failed to upload image. Please try again.' };
    }

    // Get public URL
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return { success: true, url: data.publicUrl };
  } catch (error: any) {
    logger.error('Unexpected avatar upload error:', error);
    return { success: false, error: 'An unexpected error occurred during upload.' };
  }
}

/**
 * Deletes old avatar from storage
 */
export async function deleteOldAvatar(avatarUrl: string, userId: string): Promise<void> {
  try {
    if (!avatarUrl || !avatarUrl.includes('/avatars/')) return;
    
    // Extract file path from URL
    const urlParts = avatarUrl.split('/avatars/');
    if (urlParts.length !== 2) return;
    
    const filePath = urlParts[1];
    if (!filePath.startsWith(userId + '/')) return; // Security check
    
    await supabase.storage.from('avatars').remove([filePath]);
  } catch (error) {
    logger.warn('Failed to delete old avatar:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Gets image dimensions
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
