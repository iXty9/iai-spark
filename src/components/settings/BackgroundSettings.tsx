
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, X, Loader2, Info, AlertTriangle, ImageIcon } from 'lucide-react';
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
        ) : (
          <div 
            className={`w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/30 hover:border-muted-foreground/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center space-y-2">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Drag and drop an image here or use the button below
              </p>
            </div>
          </div>
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

      {/* Upload Button */}
      <Button variant="outline" asChild className="w-full" disabled={isLoading}>
        <label className="cursor-pointer">
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
          />
        </label>
      </Button>

      {/* Opacity Control */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label htmlFor="opacity">Background Opacity</Label>
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
        />
      </div>
      
      {/* Tips */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-sm">Tips for best results:</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>• Use images sized at least 1920×1080px</div>
          <div>• Maximum file size: 5MB</div>
          <div>• Supported: JPG, PNG, WebP, GIF</div>
        </div>
      </div>
    </div>
  );
}
