import { withSupabase } from '@/utils/supabase-helpers';
import { logger } from '@/utils/logging';

// Create storage buckets if they don't exist
export async function ensureStorageBucketsExist(): Promise<boolean> {
  try {
    return withSupabase(async (client) => {
      const requiredBuckets = ['avatars', 'public', 'private'];
      let allSuccess = true;
      
      for (const bucket of requiredBuckets) {
        try {
          const { data: buckets } = await client.storage.listBuckets();
          const bucketExists = buckets?.some(b => b.name === bucket);
          
          if (!bucketExists) {
            const { error } = await client.storage.createBucket(bucket, {
              public: bucket === 'public'
            });
            
            if (error) {
              logger.error(`Failed to create bucket '${bucket}'`, error);
              allSuccess = false;
            } else {
              logger.info(`Created bucket '${bucket}'`);
            }
          }
        } catch (err) {
          logger.error(`Error working with bucket '${bucket}'`, err);
          allSuccess = false;
        }
      }
      
      return allSuccess;
    });
  } catch (err) {
    logger.error('Error ensuring storage buckets exist', err);
    return false;
  }
}

// Storage service functions using withSupabase helper

/**
 * Upload a file to storage
 */
export async function uploadFile(
  bucketName: string,
  filePath: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<string | null> {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: options?.upsert || false,
        });

      if (error) {
        logger.error('Failed to upload file', error);
        return null;
      }

      // Get public URL for the file
      const { data: urlData } = client.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    });
  } catch (error) {
    logger.error('Error uploading file', error);
    return null;
  }
}

/**
 * Download a file from storage
 */
export async function downloadFile(
  bucketName: string,
  filePath: string
): Promise<Blob | null> {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client.storage
        .from(bucketName)
        .download(filePath);

      if (error) {
        logger.error('Failed to download file', error);
        return null;
      }

      return data;
    });
  } catch (error) {
    logger.error('Error downloading file', error);
    return null;
  }
}

/**
 * Get a public URL for a file
 */
export async function getPublicUrl(
  bucketName: string,
  filePath: string
): Promise<string | null> {
  try {
    return await withSupabase(async (client) => {
      const { data } = client.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return data.publicUrl;
    });
  } catch (error) {
    logger.error('Error getting public URL', error);
    return null;
  }
}

/**
 * List files in a bucket
 */
export async function listFiles(
  bucketName: string,
  folderPath?: string
): Promise<string[] | null> {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client.storage
        .from(bucketName)
        .list(folderPath || '');

      if (error) {
        logger.error('Failed to list files', error);
        return null;
      }

      return data.map(file => file.name);
    });
  } catch (error) {
    logger.error('Error listing files', error);
    return null;
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  bucketName: string,
  filePath: string
): Promise<boolean> {
  try {
    return await withSupabase(async (client) => {
      const { error } = await client.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        logger.error('Failed to delete file', error);
        return false;
      }

      return true;
    });
  } catch (error) {
    logger.error('Error deleting file', error);
    return false;
  }
}

/**
 * Create a signed URL for temporary access
 */
export async function createSignedUrl(
  bucketName: string,
  filePath: string,
  expiresIn: number = 60
): Promise<string | null> {
  try {
    return await withSupabase(async (client) => {
      const { data, error } = await client.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        logger.error('Failed to create signed URL', error);
        return null;
      }

      return data.signedUrl;
    });
  } catch (error) {
    logger.error('Error creating signed URL', error);
    return null;
  }
}

/**
 * Move a file within storage
 */
export async function moveFile(
  bucketName: string,
  fromPath: string,
  toPath: string
): Promise<boolean> {
  try {
    return await withSupabase(async (client) => {
      const { error } = await client.storage
        .from(bucketName)
        .move(fromPath, toPath);

      if (error) {
        logger.error('Failed to move file', error);
        return false;
      }

      return true;
    });
  } catch (error) {
    logger.error('Error moving file', error);
    return false;
  }
}

/**
 * Copy a file within storage
 */
export async function copyFile(
  bucketName: string,
  fromPath: string,
  toPath: string
): Promise<boolean> {
  try {
    return await withSupabase(async (client) => {
      const { error } = await client.storage
        .from(bucketName)
        .copy(fromPath, toPath);

      if (error) {
        logger.error('Failed to copy file', error);
        return false;
      }

      return true;
    });
  } catch (error) {
    logger.error('Error copying file', error);
    return false;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(
  bucketName: string,
  filePath: string
): Promise<boolean> {
  try {
    return await withSupabase(async (client) => {
      // Try to get file metadata - if it succeeds, file exists
      const { data, error } = await client.storage
        .from(bucketName)
        .list('', {
          limit: 1,
          offset: 0,
          search: filePath
        });

      if (error || !data || data.length === 0) {
        return false;
      }

      return data.some(file => file.name === filePath);
    });
  } catch (error) {
    logger.error('Error checking if file exists', error);
    return false;
  }
}
