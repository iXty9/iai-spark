
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { getStoredConfig } from '@/config/supabase-config';

export const AVATARS_BUCKET = 'avatars';
export const DOCUMENTS_BUCKET = 'documents';
export const MEDIA_BUCKET = 'media';
const BUCKETS = [AVATARS_BUCKET, DOCUMENTS_BUCKET, MEDIA_BUCKET];

// Helper for consistent error logging
const logError = (msg: string, error: any) =>
  logger.error(msg, typeof error === 'object' ? error : { message: String(error) });

// Ensure storage buckets exist for the application
export async function ensureStorageBucketsExist(): Promise<boolean> {
  try {
    const url = getStoredConfig()?.url?.split('//')[1] ?? 'No stored config';
    logger.info(`Checking storage buckets for connection with URL: ${url}`, { module: 'storage', once: true });

    let allSucceeded = true;
    for (const bucket of BUCKETS) {
      try {
        const { error } = await supabase.storage.from(bucket).list('', { limit: 1 });
        if (error) {
          if (error.message.includes('bucket') && error.message.includes('not found')) {
            logger.info(`Bucket ${bucket} not accessible, might need to be created by an admin`, { module: 'storage' });
          } else {
            logError(`[storage] Error accessing bucket ${bucket}:`, error);
          }
          allSucceeded = false;
        } else {
          logger.info(`Bucket ${bucket} exists and is accessible`, { module: 'storage', once: true });
        }
      } catch (error) {
        logError(`[storage] Unexpected error with bucket ${bucket}:`, error);
        allSucceeded = false;
      }
    }
    return allSucceeded;
  } catch (error) {
    logError('[storage] Failed to check/create storage buckets:', error);
    return false;
  }
}

// Upload a file to a bucket with enhanced avatar support
export async function uploadFile(
  bucket: string, path: string, file: File
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      logError(`[storage] Error uploading file to ${bucket}/${path}:`, error);
      return { url: null, error };
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (error: any) {
    logError('[storage] Unexpected error uploading file:', error);
    return { url: null, error: new Error(error.message || 'Upload failed') };
  }
}

// List files in a bucket/folder
export async function listFiles(
  bucket: string, folder = ''
): Promise<{ files: string[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(folder);
    if (error) {
      logError(`[storage] Error listing files in ${bucket}/${folder}:`, error);
      return { files: null, error };
    }
    return { files: data.map(item => item.name), error: null };
  } catch (error: any) {
    logError('[storage] Unexpected error listing files:', error);
    return { files: null, error: new Error(error.message || 'List operation failed') };
  }
}

// Delete a file from a bucket
export async function deleteFile(
  bucket: string, path: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      logError(`[storage] Error deleting file ${bucket}/${path}:`, error);
      return { success: false, error };
    }
    return { success: true, error: null };
  } catch (error: any) {
    logError('[storage] Unexpected error deleting file:', error);
    return { success: false, error: new Error(error.message || 'Delete operation failed') };
  }
}

// Check if a file exists in a bucket
export async function fileExists(
  bucket: string, path: string
): Promise<{ exists: boolean; error: Error | null }> {
  try {
    const parts = path.split('/');
    const folderPath = parts.slice(0, -1).join('/') || '';
    const fileName = parts.at(-1) || '';
    const { data, error } = await supabase.storage.from(bucket).list(folderPath, { search: fileName });
    if (error) {
      logError(`[storage] Error checking if file ${bucket}/${path} exists:`, error);
      return { exists: false, error };
    }
    return { exists: data.some(item => item.name === fileName), error: null };
  } catch (error: any) {
    logError('[storage] Unexpected error checking file existence:', error);
    return { exists: false, error: new Error(error.message || 'File check failed') };
  }
}
