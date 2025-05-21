
import { withSupabase } from './connection-service';
import { logger } from '@/utils/logging';

/**
 * Base service for managing storage buckets and files
 */

/**
 * Create a new storage bucket
 */
export async function createBucket(bucketName: string, isPublic: boolean = false) {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client.storage.createBucket(bucketName, {
        public: isPublic,
      });
      
      if (error) throw error;
      return data;
    });
  } catch (error) {
    logger.error('Error creating bucket', error, { module: 'storage-service', bucketName });
    throw error;
  }
}

/**
 * Upload a file to a storage bucket
 */
export async function uploadFile(
  bucketName: string,
  filePath: string,
  file: File,
  options?: { cacheControl?: string; upsert?: boolean }
) {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client.storage
        .from(bucketName)
        .upload(filePath, file, options);
      
      if (error) throw error;
      return data;
    });
  } catch (error) {
    logger.error('Error uploading file', error, { module: 'storage-service', bucketName, filePath });
    throw error;
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
