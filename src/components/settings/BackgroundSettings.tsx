
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, X, Loader2, Info, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const input = document.createElement('input');
        input.type = 'file';
        input.files = files;
        
        const changeEvent = new Event('change', { bubbles: true }) as any;
        changeEvent.target = input;
        
        onBackgroundImageUpload(changeEvent as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [onBackgroundImageUpload]);

  const isImageTooSmall = imageInfo.width && imageInfo.height && 
    (imageInfo.width < 1920 || imageInfo.height < 1080);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <span>Background Image</span>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </h3>
          <p className="text-sm text-muted-foreground">
            Add a custom background to your interface
          </p>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="flex justify-center">
          {backgroundImage ? (
            <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-border">
              <img
                src={backgroundImage}
                alt="Background preview"
                className="w-full h-full object-cover transition-opacity duration-200"
                style={{ opacity: backgroundOpacity }}
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 shadow-lg"
                onClick={onRemoveBackground}
                disabled={isLoading}
                aria-label="Remove background image"
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
                        className="absolute top-2 left-2 bg-black/70 hover:bg-black/80 text-white border-none shadow-lg"
                        aria-label="Image information"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1 text-xs">
                        {imageInfo.width && imageInfo.height && (
                          <div>Dimensions: {imageInfo.width}×{imageInfo.height}px</div>
                        )}
                        {imageInfo.originalSize && (
                          <div>File size: {imageInfo.originalSize}</div>
                        )}
                        {imageInfo.optimizedSize && (
                          <div>Optimized: {imageInfo.optimizedSize}</div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ) : (
            <div 
              className={`w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors duration-200 ${
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              aria-label="Drop zone for background image upload"
            >
              <div className="text-center space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No background image set</p>
                <p className="text-xs text-muted-foreground">Drag and drop an image here or use the button below</p>
              </div>
            </div>
          )}
        </div>

        {isImageTooSmall && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your image is smaller than the recommended 1920×1080px. It may appear pixelated on larger screens.
            </AlertDescription>
          </Alert>
        )}

        <Button variant="outline" asChild className="w-full" disabled={isLoading}>
          <label className="cursor-pointer flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {backgroundImage ? 'Change Background Image' : 'Upload Background Image'}
            <input
              type="file"
              accept="image/*"
              onChange={onBackgroundImageUpload}
              className="hidden"
              disabled={isLoading}
              aria-label="Upload background image file"
            />
          </label>
        </Button>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="opacity" className="text-sm font-medium">Background Opacity</Label>
            <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {Math.round(backgroundOpacity * 100)}%
            </span>
          </div>
          <Slider
            id="opacity"
            min={0.1}
            max={1}
            step={0.05}
            value={[backgroundOpacity]}
            onValueChange={onOpacityChange}
            className="w-full"
            disabled={isLoading}
            aria-label="Background opacity slider"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>More transparent</span>
            <span>Less transparent</span>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground border-t pt-4 space-y-2">
          <p>• A lower opacity will make the background color more visible through the image</p>
          <p>• For best results, use images sized at least 1920×1080px</p>
          <p>• Maximum file size: 5MB</p>
          <p>• Supported formats: JPG, PNG, WebP, GIF</p>
        </div>
      </div>
    </div>
  );
}
