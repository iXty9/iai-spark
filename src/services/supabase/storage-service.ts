
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { execSql } from './exec-sql';
import { initScripts } from './init-scripts';
import { getStoredConfig } from '@/config/supabase-config';

/**
 * Ensure the avatars storage bucket exists and is properly configured
 */
export async function ensureStorageBucketsExist(): Promise<boolean> {
  try {
    logger.info('Checking if storage buckets exist', { module: 'storage' });
    
    try {
      // Check if avatars bucket exists using listBuckets()
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        logger.error('Error checking storage buckets:', error, { module: 'storage' });
        return false;
      }
      
      const avatarsBucketExists = buckets?.some(bucket => bucket.name === 'avatars');
      
      if (avatarsBucketExists) {
        logger.info('Avatars bucket exists', { module: 'storage' });
        return true;
      }
    } catch (error) {
      // If the listBuckets method fails, try the alternative approach
      logger.warn('listBuckets failed, trying alternative check', { module: 'storage' });
    }
    
    // Alternative check: try to list files in the bucket
    try {
      await supabase.storage.from('avatars').list('');
      logger.info('Avatars bucket exists (alternative check)', { module: 'storage' });
      return true;
    } catch (error) {
      logger.info('Avatars bucket does not exist, will attempt to create it', { module: 'storage' });
    }
    
    // Get config to access service key
    const config = getStoredConfig();
    if (!config) {
      logger.error('Cannot repair storage: No Supabase configuration found');
      return false;
    }
    
    // Create the avatars bucket and set up policies
    const result = await execSql(
      config.url,
      config.serviceKey || '',
      initScripts.createAvatarsBucket + '\n' + initScripts.createAvatarsRLSPolicies
    );
    
    if (!result.success) {
      logger.error('Failed to create avatars bucket:', result.error, { module: 'storage' });
      return false;
    }
    
    logger.info('Successfully created avatars bucket', { module: 'storage' });
    return true;
    
  } catch (error) {
    logger.error('Unexpected error in ensureStorageBucketsExist:', error, { module: 'storage' });
    return false;
  }
}

/**
 * Upload an avatar image for a user
 * @param userId The user ID
 * @param fileData The file data (can be File or Blob)
 * @param fileName Optional filename (default: 'avatar.[ext]')
 */
export async function uploadAvatar(
  userId: string, 
  fileData: File | Blob,
  fileName?: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    // Ensure storage is set up before uploading
    await ensureStorageBucketsExist();
    
    // Determine file extension
    let extension = 'jpg';
    if (fileData instanceof File) {
      extension = fileData.name.split('.').pop() || 'jpg';
    } else if (fileName) {
      extension = fileName.split('.').pop() || 'jpg';
    }
    
    // Create path with user ID to enforce ownership
    const filePath = `${userId}/avatar.${extension}`;
    
    // Perform the upload
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileData, {
        upsert: true,
        contentType: fileData instanceof File ? fileData.type : 'image/jpeg'
      });
    
    if (error) {
      logger.error('Avatar upload error:', error, { 
        module: 'storage',
        user: userId // Using a field that's valid for LogOptions
      });
      return { url: null, error };
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    return { url: urlData.publicUrl, error: null };
    
  } catch (error: any) {
    logger.error('Unexpected error in uploadAvatar:', error, { module: 'storage' });
    return { url: null, error };
  }
}

/**
 * Get the avatar URL for a user
 * @param userId The user ID
 */
export function getAvatarUrl(userId: string, fileName: string = 'avatar.jpg'): string | null {
  if (!userId) return null;
  
  try {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(`${userId}/${fileName}`);
    
    return data.publicUrl;
  } catch (error) {
    logger.error('Error getting avatar URL:', error, { module: 'storage' });
    return null;
  }
}

/**
 * Delete a user's avatar
 * @param userId The user ID
 * @param fileName Optional filename (default: 'avatar.*')
 */
export async function deleteAvatar(
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    try {
      // List files in user's folder to find all avatars
      const { data: files, error: listError } = await supabase.storage
        .from('avatars')
        .list(userId);
      
      if (listError) {
        logger.error('Error listing avatars for deletion:', listError, { module: 'storage' });
        return { success: false, error: listError };
      }
      
      // If no files found
      if (!files || files.length === 0) {
        return { success: true, error: null };
      }
      
      // Delete all avatar files
      const filesToDelete = files.map(file => `${userId}/${file.name}`);
      
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove(filesToDelete);
      
      if (deleteError) {
        return { success: false, error: deleteError };
      }
    } catch (error) {
      // Bucket or folder might not exist, which is fine for deletion
      logger.info('No avatar files to delete or bucket does not exist', { module: 'storage' });
    }
    
    return { success: true, error: null };
    
  } catch (error: any) {
    logger.error('Error deleting avatar:', error, { module: 'storage' });
    return { success: false, error };
  }
}
