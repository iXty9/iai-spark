
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { toast } from '@/hooks/use-toast';
import { AVATARS_BUCKET, uploadFile } from '@/services/supabase/storage-service';

export async function updateUserProfile(userId: string, data: Record<string, any>) {
  try {
    if (!userId) {
      logger.error('Attempted to update profile without userId', { module: 'profile' });
      return { data: null, error: 'No user ID provided' };
    }
    
    // Remove null/undefined values to avoid overwriting with nulls
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    // No data to update
    if (Object.keys(cleanData).length === 0) {
      return { data: null, error: null };
    }
    
    logger.info('Updating user profile', { userId, fields: Object.keys(cleanData) }, { module: 'profile' });
    
    // Create query builder first, then await the result to fix the TypeScript error
    const query = supabase
      .from('profiles')
      .update(cleanData)
      .eq('id', userId)
      .select();
      
    // Now await the result
    const { error, data: updatedData } = await query;
    
    if (error) {
      logger.error('Error updating user profile:', error, { module: 'profile' });
      return { data: null, error };
    }
    
    return { data: updatedData, error: null };
  } catch (error) {
    logger.error('Unexpected error updating profile:', error);
    return { data: null, error };
  }
}

export async function uploadAvatar(userId: string, file: File) {
  try {
    if (!userId || !file) {
      logger.error('Missing userId or file for avatar upload', { module: 'profile' });
      return { url: null, error: 'Missing data for upload' };
    }
    
    // Create a unique filename for the avatar
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
    // Upload the file
    const { url, error } = await uploadFile(AVATARS_BUCKET, filePath, file);
    
    if (error) {
      toast({
        title: 'Avatar upload failed',
        description: error.message,
        variant: 'destructive',
      });
      return { url: null, error };
    }
    
    // Update the user profile with the new avatar_url
    if (url) {
      const { error: updateError } = await updateUserProfile(userId, {
        avatar_url: url
      });
      
      if (updateError) {
        logger.error('Error updating profile with new avatar:', updateError, { module: 'profile' });
      }
    }
    
    return { url, error: null };
  } catch (error) {
    logger.error('Unexpected error uploading avatar:', error);
    return { url: null, error };
  }
}

export async function getProfile(userId: string) {
  try {
    if (!userId) {
      logger.error('Attempted to get profile without userId', { module: 'profile' });
      return { data: null, error: 'No user ID provided' };
    }
    
    logger.info('Fetching user profile', { userId }, { module: 'profile' });
    
    const response = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    const { data, error } = response;
    
    if (error) {
      logger.error('Error fetching user profile:', error, { module: 'profile' });
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    logger.error('Unexpected error getting profile:', error);
    return { data: null, error };
  }
}
