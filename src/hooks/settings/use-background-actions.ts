
import { useState } from 'react';
import { logger } from '@/utils/logging';
import { applyBackgroundImage } from '@/utils/theme-utils';
import { useToast } from '@/hooks/use-toast';
import { optimizeImage, formatFileSize, estimateDataUrlSize } from '@/utils/image-optimizer';

export interface UseBackgroundActionsProps {
  backgroundImage: string | null;
  backgroundOpacity: number;
  setBackgroundImage: (image: string | null) => void;
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
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
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
          
          // Update state with optimized image
          setBackgroundImage(optimizedImageUrl);
          
          // Set image info for display
          setImageInfo({
            originalSize,
            optimizedSize,
            width,
            height
          });
          
          // Apply background preview immediately
          applyBackgroundImage(optimizedImageUrl, backgroundOpacity);
          logger.info('Background image uploaded, optimized and previewed', { 
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
    // Remove background image from state
    setBackgroundImage(null);
    setThumbnailImage(null);
    setImageInfo({});
    
    // Apply removal immediately for preview
    applyBackgroundImage(null, backgroundOpacity);
    logger.info('Background image removed', { module: 'settings' });
    toast({
      title: "Background removed",
      description: "Background image removed. Remember to save your changes.",
    });
  };

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0];
    setBackgroundOpacity(newOpacity);
    
    // Apply opacity change immediately for preview
    applyBackgroundImage(backgroundImage, newOpacity);
    logger.info('Background opacity changed', { module: 'settings', opacity: newOpacity });
  };

  return {
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    isLoading,
    thumbnailImage,
    imageInfo
  };
};
