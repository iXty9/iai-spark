import { withSupabase } from '@/utils/supabase-helpers';
import { logger } from '@/utils/logging';

/**
 * Storage service for Supabase
 */

/**
 * Ensure required storage buckets exist
 */
export async function ensureStorageBucketsExist(): Promise<boolean> {
  try {
    const result = await withSupabase(async (client) => {
      const requiredBuckets = [
        'avatars',
        'profiles',
        'uploads',
        'system'
      ];
      
      // Get list of existing buckets
      const { data: existingBuckets, error: listError } = await client.storage.listBuckets();
      
      if (listError) {
        logger.error('Error listing storage buckets:', listError, { module: 'storage-service' });
        return false;
      }
      
      // Create any missing buckets
      for (const bucket of requiredBuckets) {
        const exists = existingBuckets?.some(b => b.name === bucket);
        
        if (!exists) {
          logger.info(`Creating missing bucket: ${bucket}`, { module: 'storage-service' });
          
          const { error } = await client.storage.createBucket(bucket, {
            public: bucket === 'system' ? false : true
          });
          
          if (error) {
            logger.error(`Error creating bucket ${bucket}:`, error, { module: 'storage-service' });
            return false;
          }
        }
      }
      
      return true;
    });
    
    return result;
  } catch (error) {
    logger.error('Error ensuring storage buckets exist:', error);
    return false;
  }
}

/**
 * Upload a file to a bucket
 */
export async function uploadFile(
  bucket: string, 
  path: string, 
  file: File,
  options = { upsert: true }
): Promise<{ url: string | null, error: Error | null }> {
  try {
    const result = await withSupabase(async (client) => {
      const { data, error } = await client.storage
        .from(bucket)
        .upload(path, file, options);
        
      if (error) {
        logger.error(`Error uploading file to ${bucket}/${path}:`, error, { module: 'storage-service' });
        return { url: null, error };
      }
      
      // Get public URL for the uploaded file
      const { data: { publicUrl } } = client.storage
        .from(bucket)
        .getPublicUrl(data.path);
        
      return { url: publicUrl, error: null };
    });
    
    return result;
  } catch (error) {
    logger.error('Error in uploadFile:', error);
    return { url: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Get a public URL for a file
 */
export async function getPublicUrl(bucketName: string, filePath: string) {
  try {
    return await withSupabase(async (client) => {
      const { data } = client.storage.from(bucketName).getPublicUrl(filePath);
      return data.publicUrl;
    });
  } catch (error) {
    logger.error('Error getting public URL', error, { module: 'storage-service', bucketName, filePath });
    throw error;
  }
}

/**
 * List all files in a bucket or folder
 */
export async function listFiles(bucketName: string, folderPath?: string) {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client.storage
        .from(bucketName)
        .list(folderPath || '');
      
      if (error) throw error;
      return data;
    });
  } catch (error) {
    logger.error('Error listing files', error, { module: 'storage-service', bucketName, folderPath });
    throw error;
  }
}

/**
 * Download a file from storage
 */
export async function downloadFile(bucketName: string, filePath: string) {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client.storage
        .from(bucketName)
        .download(filePath);
      
      if (error) throw error;
      return data;
    });
  } catch (error) {
    logger.error('Error downloading file', error, { module: 'storage-service', bucketName, filePath });
    throw error;
  }
}
