
import { useState } from 'react';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/use-toast';
import { optimizeImage, formatFileSize, estimateDataUrlSize } from '@/utils/image-optimizer';

export interface UseBackgroundActionsProps {
  backgroundImage: string | null;
  backgroundOpacity: number;
  setBackgroundImage: (image: string | null, info?: any) => void;
  setBackgroundOpacity: (opacity: number) => void;
}

export const useBackgroundActions = ({
  backgroundImage,
  backgroundOpacity,
  setBackgroundImage,
  setBackgroundOpacity
}: UseBackgroundActionsProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imageInfo, setImageInfo] = useState<{
    originalSize?: string;
    optimizedSize?: string;
    width?: number;
    height?: number;
  }>({});
  
  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsLoading(true);
    const file = e.target.files[0];
    
    try {
      // Check file size - max 10MB for original
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Background image must be less than 10MB",
        });
        setIsLoading(false);
        return;
      }
      
      // Get image dimensions
      const img = new Image();
      const originalUrl = URL.createObjectURL(file);
      
      img.onload = async () => {
        try {
          const originalSize = formatFileSize(file.size);
          const width = img.width;
          const height = img.height;
          
          // Generate optimized version
          const optimizedImageUrl = await optimizeImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.75,
            format: 'image/jpeg'
          });
          
          // Estimate optimized size
          const optimizedSize = formatFileSize(estimateDataUrlSize(optimizedImageUrl));
          
          const newImageInfo = {
            originalSize,
            optimizedSize,
            width,
            height
          };
          
          // CRITICAL: Update state - this will automatically apply via unified controller
          setBackgroundImage(optimizedImageUrl, newImageInfo);
          setImageInfo(newImageInfo);
          
          logger.info('Background image uploaded and optimized', { 
            module: 'settings',
            originalSize,
            optimizedSize,
            dimensions: `${width}x${height}`
          });
          
          toast({
            title: "Background updated",
            description: `Image optimized from ${originalSize} to ${optimizedSize}`,
          });
          
          // Clean up original URL
          URL.revokeObjectURL(originalUrl);
        } catch (error) {
          logger.error('Error processing background image:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to process image. Please try another file.",
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(originalUrl);
        toast({
          variant: "destructive",
          title: "Invalid image",
          description: "The selected file is not a valid image.",
        });
        setIsLoading(false);
      };
      
      img.src = originalUrl;
    } catch (error) {
      logger.error('Error in background image upload:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload image. Please try again.",
      });
      setIsLoading(false);
    }
  };
  
  const handleRemoveBackground = () => {
    // CRITICAL: Remove background image - this will automatically apply via unified controller
    setBackgroundImage(null);
    setImageInfo({});
    
    logger.info('Background image removed from settings', { module: 'settings' });
    toast({
      title: "Background removed",
      description: "Background image removed. Remember to save your changes.",
    });
  };

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0];
    // CRITICAL: Update opacity - this will automatically apply via unified controller
    setBackgroundOpacity(newOpacity);
    
    logger.info('Background opacity changed in settings', { module: 'settings', opacity: newOpacity });
  };

  return {
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    isLoading,
    imageInfo
  };
};
