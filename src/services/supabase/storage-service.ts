
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { StorageError } from '@supabase/storage-js';

// Define constants for bucket names
export const AVATARS_BUCKET = 'avatars';
export const DOCUMENTS_BUCKET = 'documents';
export const MEDIA_BUCKET = 'media';

// Required buckets for the application to function
const REQUIRED_BUCKETS = [AVATARS_BUCKET, DOCUMENTS_BUCKET, MEDIA_BUCKET];

/**
 * Check if all required storage buckets exist and create them if missing
 * This is part of the self-healing process
 */
export async function ensureStorageBucketsExist(): Promise<boolean> {
  try {
    logger.info('Checking storage buckets...', { module: 'storage' });
    
    // Get list of existing buckets
    // Access storage.listBuckets safely
    const storage = supabase.storage as any;
    
    if (!storage || typeof storage.listBuckets !== 'function') {
      logger.error('Storage API not available or missing listBuckets method', { module: 'storage' });
      return false;
    }
    
    const { data: buckets, error } = await storage.listBuckets();
    
    if (error) {
      logger.error('Failed to list storage buckets:', error, { module: 'storage' });
      return false;
    }
    
    // Check for missing buckets
    const existingBucketNames = buckets?.map(b => b.name) || [];
    const missingBuckets = REQUIRED_BUCKETS.filter(b => !existingBucketNames.includes(b));
    
    logger.info(`Found ${existingBucketNames.length} buckets, ${missingBuckets.length} missing`, { 
      module: 'storage',
      existing: existingBucketNames,
      missing: missingBuckets
    });
    
    // Create any missing buckets
    for (const bucketName of missingBuckets) {
      logger.info(`Creating missing bucket: ${bucketName}`, { module: 'storage' });
      
      try {
        const createResult = await storage.createBucket(bucketName, {
          public: true
        });
        
        if (createResult.error) {
          logger.error(`Failed to create bucket ${bucketName}:`, createResult.error, { module: 'storage' });
        } else {
          logger.info(`Successfully created bucket: ${bucketName}`, { module: 'storage' });
        }
      } catch (createError: any) {
        logger.error(`Error creating bucket ${bucketName}:`, createError, { module: 'storage' });
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error ensuring storage buckets exist:', error, { module: 'storage' });
    return false;
  }
}

/**
 * Safely upload a file to a Supabase storage bucket with error handling and retry
 */
export async function uploadFile(
  bucketName: string, 
  filePath: string, 
  file: File,
  options = { upsert: true },
  retries = 1
): Promise<{ url: string | null; error: Error | null }> {
  try {
    logger.info(`Uploading file to ${bucketName}/${filePath}`, { module: 'storage' });
    
    // Upload the file
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, options);
      
    if (error) {
      // Format StorageError with statusCode for better error handling
      const formattedError: StorageError = {
        ...error,
        name: error.name || 'StorageError',
        message: error.message,
        __isStorageError: true,
        statusCode: typeof error.status === 'number' ? error.status : 500
      };
      
      logger.error(`Error uploading to ${bucketName}/${filePath}:`, formattedError, { module: 'storage' });
      
      // Retry logic for specific errors
      if (retries > 0 && error.status !== 400) { // Don't retry validation errors
        logger.info(`Retrying upload to ${bucketName}/${filePath} (${retries} attempts left)`, { module: 'storage' });
        return uploadFile(bucketName, filePath, file, options, retries - 1);
      }
      
      return { url: null, error: formattedError };
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    
    return { url: publicUrl, error: null };
  } catch (error: any) {
    logger.error(`Unexpected error uploading file to ${bucketName}/${filePath}:`, error, { module: 'storage' });
    
    // Format generic error to match StorageError
    const formattedError: StorageError = {
      name: error.name || 'StorageError',
      message: error.message || 'Unknown error during file upload',
      __isStorageError: true,
      statusCode: 500
    };
    
    return { url: null, error: formattedError };
  }
}

/**
 * List files in a Supabase storage bucket
 */
export async function listFiles(bucketName: string, path?: string): Promise<{ files: string[]; error: Error | null }> {
  try {
    logger.info(`Listing files in ${bucketName}${path ? '/' + path : ''}`, { module: 'storage' });
    
    // List files
    const storage = supabase.storage.from(bucketName) as any;
    
    if (!storage || typeof storage.list !== 'function') {
      logger.error('Storage API not available or missing list method', { module: 'storage' });
      return { files: [], error: new Error('Storage API not available') };
    }
    
    const { data, error } = await storage.list(path);
    
    if (error) {
      // Format StorageError with statusCode for better error handling
      const formattedError: StorageError = {
        ...error,
        name: error.name || 'StorageError',
        message: error.message,
        __isStorageError: true,
        statusCode: typeof error.status === 'number' ? error.status : 500
      };
      
      logger.error(`Error listing files in ${bucketName}${path ? '/' + path : ''}:`, formattedError, { module: 'storage' });
      return { files: [], error: formattedError };
    }
    
    // Extract file names
    const files = data?.map(item => item.name) || [];
    
    return { files, error: null };
  } catch (error: any) {
    logger.error(`Unexpected error listing files in ${bucketName}${path ? '/' + path : ''}:`, error, { module: 'storage' });
    
    // Format generic error to match StorageError
    const formattedError: StorageError = {
      name: error.name || 'StorageError',
      message: error.message || 'Unknown error listing files',
      __isStorageError: true,
      statusCode: 500
    };
    
    return { files: [], error: formattedError };
  }
}

/**
 * Delete a file from a Supabase storage bucket
 */
export async function deleteFile(bucketName: string, filePath: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    logger.info(`Deleting file ${bucketName}/${filePath}`, { module: 'storage' });
    
    // Delete the file
    const storage = supabase.storage.from(bucketName) as any;
    
    if (!storage || typeof storage.remove !== 'function') {
      logger.error('Storage API not available or missing remove method', { module: 'storage' });
      return { success: false, error: new Error('Storage API not available') };
    }
    
    const { error } = await storage.remove([filePath]);
    
    if (error) {
      // Format StorageError with statusCode for better error handling
      const formattedError: StorageError = {
        ...error,
        name: error.name || 'StorageError',
        message: error.message,
        __isStorageError: true,
        statusCode: typeof error.status === 'number' ? error.status : 500
      };
      
      logger.error(`Error deleting file ${bucketName}/${filePath}:`, formattedError, { module: 'storage' });
      return { success: false, error: formattedError };
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    logger.error(`Unexpected error deleting file ${bucketName}/${filePath}:`, error, { module: 'storage' });
    
    // Format generic error to match StorageError
    const formattedError: StorageError = {
      name: error.name || 'StorageError',
      message: error.message || 'Unknown error deleting file',
      __isStorageError: true,
      statusCode: 500
    };
    
    return { success: false, error: formattedError };
  }
}
