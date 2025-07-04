import React from 'react';
import { Loader2, ImageIcon, AlertTriangle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
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
  autoDimDarkMode?: boolean;
  onAutoDimChange?: (enabled: boolean) => void;
  isLoading?: boolean;
  imageInfo?: ImageInfo;
}

export function BackgroundSettings({
  backgroundImage,
  backgroundOpacity,
  onBackgroundImageUpload,
  onOpacityChange,
  onRemoveBackground,
  autoDimDarkMode,
  onAutoDimChange,
  isLoading = false,
  imageInfo = {}
}: BackgroundSettingsProps) {
  const isImageTooSmall = imageInfo?.width && imageInfo?.height && 
    (imageInfo.width < 1920 || imageInfo.height < 1080);

  return (
    <div className="space-y-6">
      {/* Modern Header with Mobile-First Design */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  Background Image
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Customize your interface with a beautiful background image. Images are automatically optimized for performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Image Management Section */}
      <Card className="glass-panel border-0 shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-foreground">Image Upload & Preview</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          
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
        </CardContent>
      </Card>

      {/* Opacity Control Section */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-foreground">Background Opacity</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          
          <BackgroundOpacityControl
            backgroundOpacity={backgroundOpacity}
            onOpacityChange={onOpacityChange}
            autoDimDarkMode={autoDimDarkMode}
            onAutoDimChange={onAutoDimChange}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
      
      {/* Tips Section */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-foreground">Pro Tips</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          
          <BackgroundTips />
        </CardContent>
      </Card>
    </div>
  );
}