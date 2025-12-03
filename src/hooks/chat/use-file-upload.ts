import { useState, useCallback } from 'react';
import { logger } from '@/utils/logging';
import { optimizeImage, estimateDataUrlSize, formatFileSize } from '@/utils/image-optimizer';
import { toast } from '@/hooks/use-toast';

export interface FileUploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

// File size limits
const FILE_LIMITS = {
  image: { maxSize: 20 * 1024 * 1024, label: '20MB' },  // Images can be larger since we optimize
  document: { maxSize: 10 * 1024 * 1024, label: '10MB' }
};

// Allowed file types
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['text/plain', 'application/pdf', 'application/json', 'text/csv', 'text/markdown']
};

const isImageType = (mimeType: string): boolean => {
  return ALLOWED_TYPES.images.includes(mimeType) || mimeType.startsWith('image/');
};

const isAllowedType = (mimeType: string): boolean => {
  return isImageType(mimeType) || ALLOWED_TYPES.documents.includes(mimeType);
};

const getFileTypeLabel = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('json')) return 'JSON';
  if (mimeType.includes('text')) return 'text';
  return 'file';
};

export const useFileUpload = () => {
  const [uploadState, setUploadState] = useState<FileUploadState>({
    isUploading: false,
    uploadProgress: 0,
    error: null
  });

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!file) return null;

    const isImage = isImageType(file.type);
    const maxSize = isImage ? FILE_LIMITS.image.maxSize : FILE_LIMITS.document.maxSize;
    const maxSizeLabel = isImage ? FILE_LIMITS.image.label : FILE_LIMITS.document.label;

    // Validate file size
    if (file.size > maxSize) {
      const errorMsg = `${getFileTypeLabel(file.type)} files must be less than ${maxSizeLabel}. Your file is ${formatFileSize(file.size)}.`;
      setUploadState(prev => ({ ...prev, error: errorMsg }));
      toast({
        title: "File too large",
        description: errorMsg,
        variant: "destructive"
      });
      return null;
    }

    // Validate file type
    if (!isAllowedType(file.type)) {
      const errorMsg = `${getFileTypeLabel(file.type)} files are not supported. Please upload images (JPG, PNG, GIF, WebP), PDFs, JSON, or text files.`;
      setUploadState(prev => ({ ...prev, error: errorMsg }));
      toast({
        title: "File type not supported",
        description: errorMsg,
        variant: "destructive"
      });
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

      // For images, optimize before encoding
      if (isImage) {
        setUploadState(prev => ({ ...prev, uploadProgress: 20 }));
        
        try {
          const optimizedDataUrl = await optimizeImage(file, {
            maxWidth: 1024,
            maxHeight: 1024,
            quality: 0.85,
            format: file.type === 'image/png' ? 'image/png' : 'image/jpeg'
          });
          
          const optimizedSize = estimateDataUrlSize(optimizedDataUrl);
          const savings = file.size - optimizedSize;
          
          setUploadState({
            isUploading: false,
            uploadProgress: 100,
            error: null
          });
          
          // Show optimization result if significant savings
          if (savings > 50 * 1024) { // More than 50KB saved
            toast({
              title: "Image optimized",
              description: `${formatFileSize(file.size)} → ${formatFileSize(optimizedSize)} (saved ${formatFileSize(savings)})`,
            });
          }
          
          logger.info('Image optimized', {
            originalSize: file.size,
            optimizedSize,
            savings
          });
          
          return optimizedDataUrl;
        } catch (optimizeError) {
          logger.warn('Image optimization failed, using original', optimizeError);
          // Fall through to standard file reading
        }
      }

      // For non-images or if optimization failed, read as data URL
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
    clearError,
    isImageType,
    isAllowedType
  };
};
