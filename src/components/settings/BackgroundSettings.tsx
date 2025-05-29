
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
    <div className="space-y-8">
      {/* Enhanced Section Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border/30">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center space-x-3">
            <ImageIcon className="h-6 w-6 text-primary" />
            <span>Background Image</span>
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </h3>
          <p className="text-muted-foreground text-base">
            Add a custom background to enhance your interface
          </p>
        </div>
      </div>
      
      <div className="space-y-8">
        {/* Enhanced Image Preview/Upload Area */}
        <div className="bg-gradient-to-br from-muted/20 via-muted/10 to-muted/20 rounded-xl p-6 border border-border/20">
          <div className="flex justify-center">
            {backgroundImage ? (
              <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-border/50 shadow-lg group">
                <img
                  src={backgroundImage}
                  alt="Background preview"
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                  style={{ opacity: backgroundOpacity }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-3 right-3 shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm bg-destructive/90"
                  onClick={onRemoveBackground}
                  disabled={isLoading}
                  aria-label="Remove background image"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
                
                {imageInfo && (imageInfo.width || imageInfo.originalSize) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-3 left-3 bg-black/70 hover:bg-black/80 text-white border-none shadow-lg backdrop-blur-sm"
                          aria-label="Image information"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs bg-popover/95 backdrop-blur-sm">
                        <div className="space-y-1 text-xs">
                          {imageInfo.width && imageInfo.height && (
                            <div className="font-medium">Dimensions: {imageInfo.width}×{imageInfo.height}px</div>
                          )}
                          {imageInfo.originalSize && (
                            <div>File size: {imageInfo.originalSize}</div>
                          )}
                          {imageInfo.optimizedSize && (
                            <div className="text-green-400">Optimized: {imageInfo.optimizedSize}</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ) : (
              <div 
                className={`w-full h-64 border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer hover:shadow-lg ${
                  dragOver 
                    ? 'border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 shadow-lg' 
                    : 'border-muted-foreground/30 hover:border-muted-foreground/50 bg-gradient-to-br from-muted/10 to-muted/5'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label="Drop zone for background image upload"
              >
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-muted-foreground font-medium">No background image set</p>
                    <p className="text-sm text-muted-foreground/80">
                      Drag and drop an image here or use the button below
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isImageTooSmall && (
            <Alert className="mt-4 border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:border-amber-800 dark:from-amber-950/20 dark:to-amber-950/10">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Your image is smaller than the recommended 1920×1080px. It may appear pixelated on larger screens.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Enhanced Upload Button */}
        <Button 
          variant="outline" 
          asChild 
          className="w-full h-12 text-base font-medium hover:bg-muted/50 transition-all duration-200 border-muted-foreground/20 bg-gradient-to-r from-background to-background/80" 
          disabled={isLoading}
        >
          <label className="cursor-pointer flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            ) : (
              <Upload className="h-5 w-5 mr-3" />
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

        {/* Enhanced Opacity Control */}
        <div className="bg-gradient-to-br from-muted/20 via-muted/10 to-muted/20 rounded-xl p-6 border border-border/20 space-y-6">
          <div className="flex justify-between items-center">
            <Label htmlFor="opacity" className="text-base font-medium">Background Opacity</Label>
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-2 rounded-lg border border-border/20">
              <span className="text-sm font-mono font-semibold">
                {Math.round(backgroundOpacity * 100)}%
              </span>
            </div>
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
          <div className="flex justify-between text-sm text-muted-foreground/80">
            <span>More transparent</span>
            <span>Less transparent</span>
          </div>
        </div>
        
        {/* Enhanced Info Section */}
        <div className="bg-gradient-to-br from-muted/10 to-muted/5 rounded-lg p-6 border border-border/10 space-y-3">
          <h4 className="font-medium text-foreground/90 mb-3">Tips for best results:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 flex-shrink-0"></div>
              <span>Lower opacity reveals more background color</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 flex-shrink-0"></div>
              <span>Use images sized at least 1920×1080px</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 flex-shrink-0"></div>
              <span>Maximum file size: 5MB</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 flex-shrink-0"></div>
              <span>Supported: JPG, PNG, WebP, GIF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
