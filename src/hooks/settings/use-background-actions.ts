
import { useState } from 'react';
import { logger } from '@/utils/logging';
import { applyBackgroundImage } from '@/utils/theme-utils';

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
  
  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        const imageDataUrl = event.target.result.toString();
        setBackgroundImage(imageDataUrl);
        
        // Apply background preview immediately
        applyBackgroundImage(imageDataUrl, backgroundOpacity);
        logger.info('Background image uploaded and previewed', { module: 'settings' });
      }
    };
    
    reader.readAsDataURL(file);
  };

  return {
    handleBackgroundImageUpload
  };
};
