
import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface BackgroundOpacityControlProps {
  backgroundOpacity: number;
  onOpacityChange: (value: number[]) => void;
  isLoading?: boolean;
}

export function BackgroundOpacityControl({
  backgroundOpacity,
  onOpacityChange,
  isLoading = false
}: BackgroundOpacityControlProps) {
  return (
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
  );
}
