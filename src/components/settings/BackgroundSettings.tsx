
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, X, Loader2 } from 'lucide-react';

interface BackgroundSettingsProps {
  backgroundImage: string | null;
  backgroundOpacity: number;
  onBackgroundImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpacityChange: (value: number[]) => void;
  onRemoveBackground: () => void;
  isLoading?: boolean;
}

export function BackgroundSettings({
  backgroundImage,
  backgroundOpacity,
  onBackgroundImageUpload,
  onOpacityChange,
  onRemoveBackground,
  isLoading = false
}: BackgroundSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        {backgroundImage ? (
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-checkerboard">
            <img
              src={backgroundImage}
              alt="Background preview"
              className="w-full h-full object-cover"
              style={{ opacity: backgroundOpacity }} // Preview with the current opacity
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
      
      <div className="text-sm text-muted-foreground">
        <p>A lower opacity will make the background color more visible through the image.</p>
      </div>
    </div>
  );
}
