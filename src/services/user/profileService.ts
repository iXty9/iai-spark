
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { uploadAvatar, ensureStorageBucketsExist } from '@/services/supabase/storage-service';

export interface ProfileUpdateData {
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone_number?: string;
  phone_country_code?: string;
  theme_settings?: string;
}

/**
 * Update a user's profile
 */
export async function updateProfile(userId: string, data: ProfileUpdateData): Promise<{
  success: boolean;
  error: Error | null;
}> {
  if (!userId) {
    return {
      success: false,
      error: new Error('User ID is required'),
    };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId);

    if (error) {
      logger.error('Error updating profile:', error);
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error: any) {
    logger.error('Unexpected error updating profile:', error);
    return {
      success: false,
      error,
    };
  }
}

/**
 * Upload a profile avatar
 */
export async function uploadProfileAvatar(
  userId: string,
  file: File
): Promise<{
  success: boolean;
  url?: string;
  error: Error | null;
}> {
  try {
    // Ensure storage is properly configured
    await ensureStorageBucketsExist();
    
    // Upload the avatar
    const { url, error } = await uploadAvatar(userId, file);

    if (error) {
      return {
        success: false,
        error,
      };
    }

    if (!url) {
      return {
        success: false,
        error: new Error('Upload succeeded but no URL was returned'),
      };
    }

    // Update the profile with the new avatar URL
    const { success: updateSuccess, error: updateError } = await updateProfile(userId, {
      avatar_url: url,
    });

    if (!updateSuccess) {
      return {
        success: false,
        url,
        error: updateError,
      };
    }

    return {
      success: true,
      url,
      error: null,
    };
  } catch (error: any) {
    logger.error('Error uploading profile avatar:', error);
    return {
      success: false,
      error,
    };
  }
}
