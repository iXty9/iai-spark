
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, X, Loader2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
  return (
    <Card className="bg-card/90 backdrop-blur-sm border shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Background Image</CardTitle>
        <CardDescription>Add a custom background to your interface</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        <div className="flex justify-center">
          {backgroundImage ? (
            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-checkerboard border">
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
              
              {imageInfo && (imageInfo.width || imageInfo.optimizedSize) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 left-2 bg-black/50 hover:bg-black/70"
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
                          <div>Original: {imageInfo.originalSize}</div>
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
            <div className="w-full h-48 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center bg-checkerboard">
              <p className="text-muted-foreground">No background image set</p>
            </div>
          )}
        </div>

        <Button variant="outline" asChild className="w-full" disabled={isLoading}>
          <label className="cursor-pointer flex items-center justify-center">
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
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

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="opacity">Background Opacity</Label>
            <span>{Math.round(backgroundOpacity * 100)}%</span>
          </div>
          <Slider
            id="opacity"
            min={0}
            max={1}
            step={0.05}
            value={[backgroundOpacity]}
            onValueChange={onOpacityChange}
            className="w-full"
            disabled={isLoading}
          />
        </div>
        
        <div className="text-sm text-muted-foreground border-t pt-4 mt-4">
          <p>A lower opacity will make the background color more visible through the image.</p>
          <p className="mt-1">For best results, use images sized at least 1920×1080px.</p>
        </div>
      </CardContent>
    </Card>
  );
}
