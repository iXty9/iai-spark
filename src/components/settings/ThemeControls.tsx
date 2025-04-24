
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
        <Label htmlFor="userBubbleColor">User Message Color</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="userBubbleColor"
            name="userBubbleColor"
            type="color"
            value={colors.userBubbleColor || colors.primaryColor}
            onChange={onColorChange}
            className="w-12 h-8"
          />
          <Input
            type="text"
            value={colors.userBubbleColor || colors.primaryColor}
            onChange={onColorChange}
            name="userBubbleColor"
            className="flex-1"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="aiBubbleColor">AI Message Color</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="aiBubbleColor"
            name="aiBubbleColor"
            type="color"
            value={colors.aiBubbleColor || colors.accentColor}
            onChange={onColorChange}
            className="w-12 h-8"
          />
          <Input
            type="text"
            value={colors.aiBubbleColor || colors.accentColor}
            onChange={onColorChange}
            name="aiBubbleColor"
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
    </div>
  );
}
