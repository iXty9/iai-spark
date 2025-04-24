
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeColors } from '@/types/theme';

interface ThemeControlsProps {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  onColorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ThemeControls({ theme, colors, onColorChange }: ThemeControlsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="backgroundColor">Background Color</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="backgroundColor"
            name="backgroundColor"
            type="color"
            value={colors.backgroundColor}
            onChange={onColorChange}
            className="w-12 h-8"
          />
          <Input
            type="text"
            value={colors.backgroundColor}
            onChange={onColorChange}
            name="backgroundColor"
            className="flex-1"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="primaryColor">Primary Color</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="primaryColor"
            name="primaryColor"
            type="color"
            value={colors.primaryColor}
            onChange={onColorChange}
            className="w-12 h-8"
          />
          <Input
            type="text"
            value={colors.primaryColor}
            onChange={onColorChange}
            name="primaryColor"
            className="flex-1"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="textColor">Text Color</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="textColor"
            name="textColor"
            type="color"
            value={colors.textColor}
            onChange={onColorChange}
            className="w-12 h-8"
          />
          <Input
            type="text"
            value={colors.textColor}
            onChange={onColorChange}
            name="textColor"
            className="flex-1"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="accentColor">Accent Color</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="accentColor"
            name="accentColor"
            type="color"
            value={colors.accentColor}
            onChange={onColorChange}
            className="w-12 h-8"
          />
          <Input
            type="text"
            value={colors.accentColor}
            onChange={onColorChange}
            name="accentColor"
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
