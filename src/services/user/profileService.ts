
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { validateWebhookUrl, sanitizeInput } from '@/utils/validation';

export interface ProfileData {
  id?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  bio?: string;
  theme_settings?: string;
  webhook_url?: string;
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
 * Update a user's profile data with enhanced security validation
 * @param userId The user ID
 * @param updates The profile data to update
 */
export async function updateProfile(
  userId: string,
  updates: Partial<ProfileData>
) {
  try {
    // Sanitize text inputs
    const sanitizedUpdates = { ...updates };
    
    if (sanitizedUpdates.username) {
      sanitizedUpdates.username = sanitizeInput(sanitizedUpdates.username);
    }
    
    if (sanitizedUpdates.full_name) {
      sanitizedUpdates.full_name = sanitizeInput(sanitizedUpdates.full_name);
    }
    
    if (sanitizedUpdates.bio) {
      sanitizedUpdates.bio = sanitizeInput(sanitizedUpdates.bio);
    }
    
    // Validate webhook URL if being updated
    if ('webhook_url' in updates && updates.webhook_url) {
      const webhookValidation = validateWebhookUrl(updates.webhook_url);
      if (webhookValidation) {
        return { success: false, error: { message: webhookValidation } };
      }
    }
    
    const result = await supabase
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', userId);
      
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
