
import { logger } from '@/utils/logging';
import { supabase } from '@/integrations/supabase/client';
import { connectionService } from '@/services/config/connection-service';

/**
 * Upload a file to Supabase storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean }
): Promise<{ data: any; error: any }> {
  try {
    logger.info('Uploading file to storage', { bucket, path, size: file.size });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options);

    if (error) {
      logger.error('Error uploading file', error);
      return { data: null, error };
    }

    logger.info('File uploaded successfully', { bucket, path });
    return { data, error: null };
  } catch (error) {
    logger.error('Exception in uploadFile', error);
    return { data: null, error };
  }
}

/**
 * Download a file from Supabase storage
 */
export async function downloadFile(bucket: string, path: string): Promise<{ data: Blob | null; error: any }> {
  try {
    logger.info('Downloading file from storage', { bucket, path });

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      logger.error('Error downloading file', error);
      return { data: null, error };
    }

    logger.info('File downloaded successfully', { bucket, path });
    return { data, error: null };
  } catch (error) {
    logger.error('Exception in downloadFile', error);
    return { data: null, error };
  }
}

/**
 * Get a public URL for a file
 */
export function getPublicUrl(bucket: string, path: string): string {
  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    logger.error('Exception in getPublicUrl', error);
    return '';
  }
}

/**
 * List files in a storage bucket
 */
export async function listFiles(bucket: string, path?: string): Promise<{ data: any[] | null; error: any }> {
  try {
    logger.info('Listing files in storage', { bucket, path });

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);

    if (error) {
      logger.error('Error listing files', error);
      return { data: null, error };
    }

    logger.info('Files listed successfully', { bucket, path, count: data?.length });
    return { data, error: null };
  } catch (error) {
    logger.error('Exception in listFiles', error);
    return { data: null, error };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, paths: string[]): Promise<{ data: any; error: any }> {
  try {
    logger.info('Deleting files from storage', { bucket, paths });

    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      logger.error('Error deleting files', error);
      return { data: null, error };
    }

    logger.info('Files deleted successfully', { bucket, paths });
    return { data, error: null };
  } catch (error) {
    logger.error('Exception in deleteFile', error);
    return { data: null, error };
  }
}
