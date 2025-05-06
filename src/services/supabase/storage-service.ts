
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { optimizeImage } from '@/utils/image-optimizer';

// Define supported bucket names
export const AVATARS_BUCKET = 'avatars';
export const BACKGROUNDS_BUCKET = 'backgrounds';

/**
 * Check if a bucket exists, and create it if it doesn't
 */
export async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    // First check if the bucket exists by trying to list files
    const { data, error } = await supabase.storage.listBuckets();
    
    const bucketExists = data?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      logger.info(`Creating bucket ${bucketName} as it doesn't exist`, { module: 'storage' });
      
      // Create the bucket using the createBucket method
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        logger.error(`Failed to create bucket ${bucketName}:`, createError, { module: 'storage' });
        return false;
      }
      
      logger.info(`Successfully created bucket ${bucketName}`, { module: 'storage' });
      return true;
    }
    
    return !error;
  } catch (error) {
    logger.error(`Error ensuring bucket ${bucketName} exists:`, error, { module: 'storage' });
    return false;
  }
}

/**
 * Ensure all storage buckets required by the application exist
 */
export async function ensureStorageBucketsExist(): Promise<boolean> {
  try {
    const avatarsBucketExists = await ensureBucketExists(AVATARS_BUCKET);
    const backgroundsBucketExists = await ensureBucketExists(BACKGROUNDS_BUCKET);
    
    return avatarsBucketExists && backgroundsBucketExists;
  } catch (error) {
    logger.error('Error ensuring storage buckets exist:', error, { module: 'storage' });
    return false;
  }
}

/**
 * List files in a bucket directory
 */
export async function listFiles(bucketName: string, path: string = '') {
  try {
    // Ensure bucket exists
    await ensureBucketExists(bucketName);
    
    const { data, error } = await supabase.storage.from(bucketName).list(path);
    
    if (error) {
      logger.error(`Error listing files in ${bucketName}/${path}:`, error, { module: 'storage' });
      return { files: [], error };
    }
    
    return { files: data, error: null };
  } catch (error) {
    logger.error(`Unexpected error listing files in ${bucketName}/${path}:`, error, { module: 'storage' });
    return { files: [], error };
  }
}

/**
 * Upload an avatar for a user
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  return uploadFile(
    file, 
    AVATARS_BUCKET, 
    `${userId}/${crypto.randomUUID()}`, 
    { optimize: true, maxWidth: 400, maxHeight: 400 }
  );
}

/**
 * Upload a background image
 */
export async function uploadBackground(
  userId: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  return uploadFile(
    file, 
    BACKGROUNDS_BUCKET, 
    `${userId}/${crypto.randomUUID()}`, 
    { optimize: true, maxWidth: 1920, maxHeight: 1080 }
  );
}

/**
 * Upload a file to a Supabase bucket
 */
export async function uploadFile(
  file: File,
  bucketName: string,
  path: string,
  options: {
    optimize?: boolean;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<{ url: string | null; error: Error | null }> {
  try {
    // Ensure bucket exists
    const bucketExists = await ensureBucketExists(bucketName);
    if (!bucketExists) {
      return { url: null, error: new Error(`Bucket ${bucketName} doesn't exist and couldn't be created`) };
    }
    
    // Process file if needed
    let fileToUpload: File | Blob = file;
    
    if (options.optimize && file.type.startsWith('image/')) {
      try {
        const optimized = await optimizeImage(file, {
          maxWidth: options.maxWidth,
          maxHeight: options.maxHeight,
          quality: options.quality || 0.8,
          format: 'image/jpeg'
        });
        
        if (optimized) {
          fileToUpload = optimized;
          logger.info('Image optimized for upload', { 
            module: 'storage',
            originalSize: file.size, 
            optimizedSize: fileToUpload.size 
          });
        }
      } catch (error) {
        logger.warn('Failed to optimize image, using original:', error, { module: 'storage' });
        // Continue with original file if optimization fails
      }
    }
    
    // Upload file using the correct method
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .upload(path, fileToUpload, {
        upsert: true
      });
    
    if (error) {
      logger.error(`Error uploading file to ${bucketName}/${path}:`, error, { module: 'storage' });
      return { url: null, error };
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(data.path);
    
    logger.info(`File uploaded successfully to ${bucketName}/${path}`, { 
      module: 'storage'
    });
    
    return { url: publicUrl, error: null };
  } catch (error) {
    logger.error(`Unexpected error uploading file to ${bucketName}/${path}:`, error, { module: 'storage' });
    return { url: null, error: error as Error };
  }
}

/**
 * Delete a file from a Supabase bucket
 */
export async function deleteFile(bucketName: string, path: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .storage
      .from(bucketName)
      .remove([path]);
    
    if (error) {
      logger.error(`Error deleting file ${bucketName}/${path}:`, error, { module: 'storage' });
      return false;
    }
    
    logger.info(`File deleted successfully: ${bucketName}/${path}`, { module: 'storage' });
    return true;
  } catch (error) {
    logger.error(`Unexpected error deleting file ${bucketName}/${path}:`, error, { module: 'storage' });
    return false;
  }
}
