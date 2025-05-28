
import { useState, useCallback } from 'react';
import { logger } from '@/utils/logging';

export interface FileUploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

export const useFileUpload = () => {
  const [uploadState, setUploadState] = useState<FileUploadState>({
    isUploading: false,
    uploadProgress: 0,
    error: null
  });

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!file) return null;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadState(prev => ({
        ...prev,
        error: 'File size must be less than 10MB'
      }));
      return null;
    }

    // Validate file type
    const allowedTypes = ['image/', 'text/', 'application/pdf', 'application/json'];
    const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
    
    if (!isAllowedType) {
      setUploadState(prev => ({
        ...prev,
        error: 'File type not supported. Please upload images, text files, PDF, or JSON files.'
      }));
      return null;
    }

    setUploadState({
      isUploading: true,
      uploadProgress: 0,
      error: null
    });

    try {
      logger.info('Starting file upload', { 
        fileName: file.name, 
        fileSize: file.size, 
        fileType: file.type 
      });

      // For now, we'll read the file content and return it as a data URL
      // In the future, this could upload to Supabase Storage
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          setUploadState({
            isUploading: false,
            uploadProgress: 100,
            error: null
          });
          resolve(reader.result as string);
        };
        
        reader.onerror = () => {
          setUploadState({
            isUploading: false,
            uploadProgress: 0,
            error: 'Failed to read file'
          });
          reject(new Error('Failed to read file'));
        };
        
        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadState(prev => ({
              ...prev,
              uploadProgress: progress
            }));
          }
        };
        
        reader.readAsDataURL(file);
      });
    } catch (error) {
      logger.error('File upload failed', error);
      setUploadState({
        isUploading: false,
        uploadProgress: 0,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setUploadState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    uploadState,
    uploadFile,
    clearError
  };
};
