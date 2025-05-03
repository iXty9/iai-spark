
import { useState } from 'react';
import { logger } from '@/utils/logging';
import { applyBackgroundImage } from '@/utils/theme-utils';
import { useToast } from '@/hooks/use-toast';

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
  
  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsLoading(true);
    const file = e.target.files[0];
    
    // Check file size - max 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Background image must be less than 5MB",
      });
      setIsLoading(false);
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        const imageDataUrl = event.target.result.toString();
        setBackgroundImage(imageDataUrl);
        
        // Apply background preview immediately
        applyBackgroundImage(imageDataUrl, backgroundOpacity);
        logger.info('Background image uploaded and previewed', { module: 'settings' });
        toast({
          title: "Background updated",
          description: "Background image applied. Remember to save your changes.",
        });
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to read image file. Please try again.",
      });
      setIsLoading(false);
    };
    
    reader.readAsDataURL(file);
  };
  
  const handleRemoveBackground = () => {
    // Remove background image from state
    setBackgroundImage(null);
    
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
    isLoading
  };
};
