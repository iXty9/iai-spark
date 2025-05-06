
import { supabase } from '@/integrations/supabase/client';
import { StorageError } from '@supabase/storage-js';
import { logger } from '@/utils/logging';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
}

/**
 * Check if a storage bucket exists
 */
export async function checkIfBucketExists(bucketName: string): Promise<boolean> {
  try {
    // Get list of buckets and check if our bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      logger.error(`Error checking if bucket ${bucketName} exists:`, error);
      return false;
    }
    
    return buckets?.some(bucket => bucket.name === bucketName) || false;
  } catch (error) {
    logger.error(`Unexpected error checking if bucket ${bucketName} exists:`, error);
    return false;
  }
}

/**
 * Create a new storage bucket if it doesn't exist
 */
export async function createBucketIfNotExists(bucketName: string, isPublic = true): Promise<boolean> {
  try {
    const bucketExists = await checkIfBucketExists(bucketName);
    
    if (bucketExists) {
      return true;
    }
    
    // Create bucket
    const { error } = await supabase.storage.createBucket({
      name: bucketName,
      public: isPublic
    });
    
    if (error) {
      logger.error(`Error creating bucket ${bucketName}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Unexpected error creating bucket ${bucketName}:`, error);
    return false;
  }
}

/**
 * Ensure required storage buckets exist for the application
 * This function is called by the SystemSelfHealer component
 */
export async function ensureStorageBucketsExist(): Promise<boolean> {
  try {
    logger.info('Ensuring storage buckets exist', { module: 'storage' });
    
    // List of required buckets and their public status
    const requiredBuckets = [
      { name: 'avatars', isPublic: true },
      { name: 'uploads', isPublic: true },
      { name: 'backgrounds', isPublic: true }
    ];
    
    // Create all required buckets
    for (const bucket of requiredBuckets) {
      const success = await createBucketIfNotExists(bucket.name, bucket.isPublic);
      if (!success) {
        logger.error(`Failed to create bucket ${bucket.name}`, { module: 'storage' });
        return false;
      }
      logger.info(`Bucket ${bucket.name} is ready`, { module: 'storage' });
    }
    
    return true;
  } catch (error) {
    logger.error('Error ensuring storage buckets exist:', error, { module: 'storage' });
    return false;
  }
}

/**
 * List files in a bucket with an optional path prefix
 */
export async function listFiles(bucket: string, prefix = ''): Promise<{ data: any[] | null, error: StorageError | null }> {
  try {
    // Ensure bucket exists
    const bucketExists = await checkIfBucketExists(bucket);
    
    if (!bucketExists) {
      logger.error(`Bucket ${bucket} does not exist`);
      return { data: null, error: { name: 'BucketNotFound', message: `Bucket ${bucket} not found`, statusCode: '404' } };
    }
    
    // List files
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix);
    
    if (error) {
      logger.error(`Error listing files in bucket ${bucket} with prefix ${prefix}:`, error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error: any) {
    logger.error(`Unexpected error listing files in bucket ${bucket}:`, error);
    return { data: null, error: { name: 'UnexpectedError', message: error.message || 'Unexpected error', statusCode: '500' } };
  }
}

/**
 * Extract file info
 */
export function extractFileInfo(file: File): FileInfo {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  };
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  makePublic = true
): Promise<{ publicUrl: string | null; error: StorageError | null }> {
  try {
    // Ensure bucket exists
    await createBucketIfNotExists(bucket, makePublic);
    
    // Upload file
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true
      });
    
    if (error) {
      logger.error(`Error uploading file to ${bucket}/${path}:`, error);
      return { publicUrl: null, error };
    }
    
    // Get public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return { publicUrl: data.publicUrl, error: null };
  } catch (error: any) {
    logger.error(`Unexpected error uploading file to ${bucket}/${path}:`, error);
    return { publicUrl: null, error: { name: 'UnexpectedError', message: error.message || 'Unexpected error', statusCode: '500' } };
  }
}

/**
 * Upload a base64 image to storage
 */
export async function uploadBase64Image(
  bucket: string,
  path: string,
  base64Data: string,
  makePublic = true
): Promise<{ publicUrl: string | null; error: StorageError | null }> {
  try {
    // Remove data URL prefix if present
    const base64String = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;
    
    // Determine the content type from the data URL
    let contentType = 'image/png'; // Default
    if (base64Data.includes('data:')) {
      contentType = base64Data.split(';')[0].split(':')[1];
    }
    
    // Convert base64 to blob
    const byteCharacters = atob(base64String);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
      const slice = byteCharacters.slice(offset, offset + 1024);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type: contentType });
    
    // Upload the blob
    return await uploadFile(bucket, path, blob, makePublic);
  } catch (error: any) {
    logger.error(`Unexpected error uploading base64 image to ${bucket}/${path}:`, error);
    return { publicUrl: null, error: { name: 'UnexpectedError', message: error.message || 'Unexpected error', statusCode: '500' } };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) {
      logger.error(`Error deleting file ${bucket}/${path}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Unexpected error deleting file ${bucket}/${path}:`, error);
    return false;
  }
}
