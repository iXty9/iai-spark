
import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface BackgroundOpacityControlProps {
  backgroundOpacity: number;
  onOpacityChange: (value: number[]) => void;
  autoDimDarkMode?: boolean;
  onAutoDimChange?: (enabled: boolean) => void;
  isLoading?: boolean;
}

export function BackgroundOpacityControl({
  backgroundOpacity,
  onOpacityChange,
  autoDimDarkMode = true,
  onAutoDimChange,
  isLoading = false
}: BackgroundOpacityControlProps) {
  return (
    <div className="space-y-4">
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
      
      {onAutoDimChange && (
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-1">
            <Label htmlFor="auto-dim">Auto-dim in dark mode</Label>
            <p className="text-xs text-muted-foreground">
              Automatically reduce opacity in dark mode for better readability
            </p>
          </div>
          <Switch
            id="auto-dim"
            checked={autoDimDarkMode}
            onCheckedChange={onAutoDimChange}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}
