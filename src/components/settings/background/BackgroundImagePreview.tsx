
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Info } from 'lucide-react';

interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

interface BackgroundImagePreviewProps {
  backgroundImage: string;
  backgroundOpacity: number;
  onRemoveBackground: () => void;
  isLoading?: boolean;
  imageInfo?: ImageInfo;
}

export function BackgroundImagePreview({
  backgroundImage,
  backgroundOpacity,
  onRemoveBackground,
  isLoading = false,
  imageInfo = {}
}: BackgroundImagePreviewProps) {
  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden border group">
      <img
        src={backgroundImage}
        alt="Background preview"
        className="w-full h-full object-cover"
        style={{ opacity: backgroundOpacity }}
      />
      
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-2 right-2"
        onClick={onRemoveBackground}
        disabled={isLoading}
      >
        <X className="h-4 w-4 mr-1" />
        Remove
      </Button>
      
      {imageInfo && (imageInfo.width || imageInfo.originalSize) && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 left-2 bg-black/70 hover:bg-black/80 text-white"
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="space-y-1 text-xs">
                {imageInfo.width && imageInfo.height && (
                  <div>Dimensions: {imageInfo.width}×{imageInfo.height}px</div>
                )}
                {imageInfo.originalSize && (
                  <div>File size: {imageInfo.originalSize}</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
