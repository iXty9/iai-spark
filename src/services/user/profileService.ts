
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

export interface ProfileData {
  id?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  bio?: string;
  theme_settings?: string;
}

/**
 * Fetch a user's profile by their ID
 * @param userId The user ID
 */
export async function fetchProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select()
      .eq('id', userId)
      .single();
    
    if (error) {
      logger.error('Error fetching profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    logger.error('Unexpected error fetching profile:', error);
    return null;
  }
}

/**
 * Update a user's profile data
 * @param userId The user ID
 * @param updates The profile data to update
 */
export async function updateProfile(
  userId: string,
  updates: Partial<ProfileData>
) {
  try {
    // Use async/await properly with the PostgrestFilterBuilder
    const result = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
      
    // Now we can check the error property
    if (result.error) {
      logger.error('Error updating profile:', result.error);
      return { success: false, error: result.error };
    }
    
    logger.info('Profile updated successfully');
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error updating profile:', error);
    return { success: false, error };
  }
}
