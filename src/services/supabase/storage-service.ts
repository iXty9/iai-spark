
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { StorageError } from '@supabase/storage-js';
import { getStoredConfig } from '@/config/supabase-config';

// Define bucket names as constants
export const AVATARS_BUCKET = 'avatars';
export const DOCUMENTS_BUCKET = 'documents';
export const MEDIA_BUCKET = 'media';

const BUCKETS = [AVATARS_BUCKET, DOCUMENTS_BUCKET, MEDIA_BUCKET];

/**
 * Ensure storage buckets exist for the application
 * This is a self-healing function that will create buckets if they don't exist
 */
export async function ensureStorageBucketsExist(): Promise<boolean> {
  try {
    // Get the stored config to check connection details
    const storedConfig = getStoredConfig();
    logger.info('Checking storage buckets for connection with URL: ' + 
      (storedConfig?.url ? storedConfig.url.split('//')[1] : 'No stored config'),
      { module: 'storage', once: true }
    );

    let allSucceeded = true;
    
    for (const bucket of BUCKETS) {
      try {
        // Check if the bucket exists
        const { data, error } = await supabase.storage.getBucket(bucket);
        
        if (error) {
          // If the bucket doesn't exist, create it
          if (error.message.includes('not found')) {
            logger.info(`Bucket ${bucket} not found, creating it...`, { module: 'storage' });
            
            const createResult = await supabase.storage.createBucket(bucket, {
              public: false, // Set to public: true if the bucket should be publicly accessible
            });
            
            if (createResult.error) {
              // Custom error handling with proper TypeScript typing
              const customError = createResult.error as Error;
              logger.error(`[storage] Failed to create bucket ${bucket}:`, {
                message: customError.message,
                name: customError.name,
                // Only add status if it exists
                ...(customError instanceof Error && 'status' in customError
                  ? { status: (customError as any).status }
                  : {})
              }, { module: 'storage' });
              
              allSucceeded = false;
              continue;
            }
            
            logger.info(`Successfully created bucket: ${bucket}`, { module: 'storage' });
          } else {
            logger.error(`[storage] Error checking bucket ${bucket}:`, error, { module: 'storage' });
            allSucceeded = false;
          }
        } else {
          logger.info(`Bucket ${bucket} already exists`, { module: 'storage', once: true });
        }
      } catch (error) {
        logger.error(`[storage] Unexpected error with bucket ${bucket}:`, error, { module: 'storage' });
        allSucceeded = false;
      }
    }
    
    return allSucceeded;
  } catch (error) {
    logger.error('[storage] Failed to check/create storage buckets:', error);
    return false;
  }
}

/**
 * Upload a file to a bucket
 * @param bucket Bucket name
 * @param path Path within the bucket
 * @param file File to upload
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  try {
    // Perform upload
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    
    if (error) {
      // Handle error properly with TypeScript
      logger.error(`[storage] Error uploading file to ${bucket}/${path}:`, {
        message: error.message,
        name: error.name
      });
      return { url: null, error };
    }
    
    // Get public URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    
    return { url: data.publicUrl, error: null };
  } catch (error: any) {
    logger.error('[storage] Unexpected error uploading file:', error);
    return { url: null, error: new Error(error.message || 'Upload failed') };
  }
}

/**
 * List files in a bucket/folder
 * @param bucket Bucket name
 * @param folder Folder path (optional)
 */
export async function listFiles(bucket: string, folder?: string): Promise<{
  files: string[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder || '');
    
    if (error) {
      logger.error(`[storage] Error listing files in ${bucket}/${folder || ''}:`, {
        message: error.message,
        name: error.name
      });
      return { files: null, error };
    }
    
    // Extract file paths from the data
    const files = data.map(item => item.name);
    return { files, error: null };
  } catch (error: any) {
    logger.error('[storage] Unexpected error listing files:', error);
    return { files: null, error: new Error(error.message || 'List operation failed') };
  }
}

/**
 * Delete a file from a bucket
 * @param bucket Bucket name
 * @param path Path within the bucket
 */
export async function deleteFile(bucket: string, path: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) {
      logger.error(`[storage] Error deleting file ${bucket}/${path}:`, {
        message: error.message,
        name: error.name
      });
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    logger.error('[storage] Unexpected error deleting file:', error);
    return { success: false, error: new Error(error.message || 'Delete operation failed') };
  }
}

/**
 * Check if a file exists in a bucket
 * @param bucket Bucket name
 * @param path Path within the bucket
 */
export async function fileExists(bucket: string, path: string): Promise<{ exists: boolean; error: Error | null }> {
  try {
    // Try to get the metadata of the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop() || '',
      });
    
    if (error) {
      logger.error(`[storage] Error checking if file ${bucket}/${path} exists:`, {
        message: error.message,
        name: error.name
      });
      return { exists: false, error };
    }
    
    // Check if the file was found in the results
    const exists = data.some(item => item.name === path.split('/').pop());
    return { exists, error: null };
  } catch (error: any) {
    logger.error('[storage] Unexpected error checking file existence:', error);
    return { exists: false, error: new Error(error.message || 'File check failed') };
  }
}
