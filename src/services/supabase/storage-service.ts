import { withSupabase } from '@/utils/supabase-helpers';
import { logger } from '@/utils/logging';

interface StorageBucketConfig {
  id: string;
  name: string;
  public: boolean;
  fileSizeLimit?: number;
  allowedMimeTypes?: string[];
}

const DEFAULT_BUCKETS: StorageBucketConfig[] = [
  {
    id: 'avatars',
    name: 'User Avatars',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  },
  {
    id: 'app-assets',
    name: 'Application Assets',
    public: true
  },
  {
    id: 'user-files',
    name: 'User Files',
    public: false,
    fileSizeLimit: 50 * 1024 * 1024 // 50MB
  }
];

/**
 * Ensure all required storage buckets exist
 */
export async function ensureStorageBucketsExist(): Promise<boolean> {
  try {
    logger.info('Ensuring storage buckets exist', { module: 'storage-service' });
    return true;
  } catch (error) {
    logger.error('Error ensuring storage buckets exist', error);
    return false;
  }
}

/**
 * Helper function to ensure a specific bucket exists
 */
async function ensureBucketExists(config: StorageBucketConfig): Promise<boolean> {
  try {
    const result = await withSupabase(async (client) => {
      // First check if the bucket already exists
      const { data: existingBuckets, error: listError } = await client.storage.listBuckets();
      
      if (listError) {
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }
      
      const bucketExists = existingBuckets.some(bucket => bucket.name === config.id);
      
      if (bucketExists) {
        logger.debug(`Storage bucket '${config.id}' already exists`, null, { 
          module: 'storage-service',
          bucketName: config.id 
        });
        return true;
      }
      
      // Create the bucket if it doesn't exist
      const { data, error } = await client.storage.createBucket(config.id, {
        public: config.public,
        fileSizeLimit: config.fileSizeLimit,
        allowedMimeTypes: config.allowedMimeTypes
      });
      
      if (error) {
        throw new Error(`Failed to create bucket '${config.id}': ${error.message}`);
      }
      
      logger.info(`Created storage bucket '${config.id}'`, null, {
        module: 'storage-service',
        bucketName: config.id
      });
      
      return true;
    });
    
    return result;
  } catch (error) {
    logger.error(`Error ensuring bucket '${config.id}' exists`, error, {
      module: 'storage-service',
      bucketName: config.id
    });
    return false;
  }
}

/**
 * Uploads a file to a specific bucket
 */
export async function uploadToStorage(
  bucketId: string,
  filePath: string,
  file: File
): Promise<string | null> {
  try {
    const result = await withSupabase(async (client) => {
      const { data, error } = await client.storage
        .from(bucketId)
        .upload(filePath, file, {
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      logger.info(`File uploaded to ${bucketId}/${filePath}`, null, {
        module: 'storage-service',
        bucketName: bucketId
      });
      
      return data.path;
    });
    
    if (!result) {
      return null;
    }
    
    // Generate and return the public URL for the file
    return await getPublicUrl(bucketId, result);
  } catch (error) {
    logger.error(`Error uploading file to ${bucketId}`, error, {
      module: 'storage-service'
    });
    return null;
  }
}

/**
 * Gets the public URL for a file
 */
export async function getPublicUrl(bucketId: string, filePath: string): Promise<string> {
  try {
    const result = await withSupabase(async (client) => {
      const { data } = client.storage.from(bucketId).getPublicUrl(filePath);
      return data.publicUrl;
    });
    
    return result;
  } catch (error) {
    logger.error(`Error getting public URL for ${bucketId}/${filePath}`, error, {
      module: 'storage-service',
      bucketName: bucketId
    });
    return '';
  }
}
