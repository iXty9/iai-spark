
import React from 'react';
import { Loader2, ImageIcon, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BackgroundImageUpload } from './background/BackgroundImageUpload';
import { BackgroundImagePreview } from './background/BackgroundImagePreview';
import { BackgroundOpacityControl } from './background/BackgroundOpacityControl';
import { BackgroundTips } from './background/BackgroundTips';

interface ImageInfo {
  originalSize?: string;
  optimizedSize?: string;
  width?: number;
  height?: number;
}

export interface BackgroundSettingsProps {
  backgroundImage: string | null;
  backgroundOpacity: number;
  onBackgroundImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpacityChange: (value: number[]) => void;
  onRemoveBackground: () => void;
  isLoading?: boolean;
  imageInfo?: ImageInfo;
}

export function BackgroundSettings({
  backgroundImage,
  backgroundOpacity,
  onBackgroundImageUpload,
  onOpacityChange,
  onRemoveBackground,
  isLoading = false,
  imageInfo = {}
}: BackgroundSettingsProps) {
  const isImageTooSmall = imageInfo?.width && imageInfo?.height && 
    (imageInfo.width < 1920 || imageInfo.height < 1080);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <ImageIcon className="h-5 w-5" />
          <span>Background Image</span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </h3>
        <p className="text-sm text-muted-foreground">
          Add a custom background to enhance your interface
        </p>
      </div>
      
      {/* Image Preview/Upload Area */}
      <div className="space-y-4">
        {backgroundImage ? (
          <BackgroundImagePreview
            backgroundImage={backgroundImage}
            backgroundOpacity={backgroundOpacity}
            onRemoveBackground={onRemoveBackground}
            isLoading={isLoading}
            imageInfo={imageInfo}
          />
        ) : (
          <BackgroundImageUpload
            onBackgroundImageUpload={onBackgroundImageUpload}
            isLoading={isLoading}
            hasBackgroundImage={!!backgroundImage}
          />
        )}

        {isImageTooSmall && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Your image is smaller than the recommended 1920×1080px. It may appear pixelated on larger screens.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Upload Button (when no image) */}
      {!backgroundImage && (
        <BackgroundImageUpload
          onBackgroundImageUpload={onBackgroundImageUpload}
          isLoading={isLoading}
          hasBackgroundImage={!!backgroundImage}
        />
      )}

      {/* Opacity Control */}
      <BackgroundOpacityControl
        backgroundOpacity={backgroundOpacity}
        onOpacityChange={onOpacityChange}
        isLoading={isLoading}
      />
      
      {/* Tips */}
      <BackgroundTips />
    </div>
  );
}
