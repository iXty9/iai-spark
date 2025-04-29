
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ThemeColors } from '@/types/theme';

interface ThemeControlsProps {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  onColorChange: (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => void;
}

export function ThemeControls({ theme, colors, onColorChange }: ThemeControlsProps) {
  const handleSliderChange = (name: string, value: number[]) => {
    onColorChange({ name, value: value[0] });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Label htmlFor="textColor">Default Text Color</Label>
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
      
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">User Message Settings</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userBubbleColor">User Message Color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="userBubbleColor"
                name="userBubbleColor"
                type="color"
                value={colors.userBubbleColor}
                onChange={onColorChange}
                className="w-12 h-8"
              />
              <Input
                type="text"
                value={colors.userBubbleColor}
                onChange={onColorChange}
                name="userBubbleColor"
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="userBubbleOpacity">User Message Opacity</Label>
              <span>{Math.round(colors.userBubbleOpacity * 100)}%</span>
            </div>
            <Slider
              id="userBubbleOpacity"
              min={0.1}
              max={1}
              step={0.05}
              value={[colors.userBubbleOpacity]}
              onValueChange={(value) => handleSliderChange('userBubbleOpacity', value)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="userTextColor">User Text Color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="userTextColor"
                name="userTextColor"
                type="color"
                value={colors.userTextColor}
                onChange={onColorChange}
                className="w-12 h-8"
              />
              <Input
                type="text"
                value={colors.userTextColor}
                onChange={onColorChange}
                name="userTextColor"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">AI Message Settings</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aiBubbleColor">AI Message Color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="aiBubbleColor"
                name="aiBubbleColor"
                type="color"
                value={colors.aiBubbleColor}
                onChange={onColorChange}
                className="w-12 h-8"
              />
              <Input
                type="text"
                value={colors.aiBubbleColor}
                onChange={onColorChange}
                name="aiBubbleColor"
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="aiBubbleOpacity">AI Message Opacity</Label>
              <span>{Math.round(colors.aiBubbleOpacity * 100)}%</span>
            </div>
            <Slider
              id="aiBubbleOpacity"
              min={0.1}
              max={1}
              step={0.05}
              value={[colors.aiBubbleOpacity]}
              onValueChange={(value) => handleSliderChange('aiBubbleOpacity', value)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="aiTextColor">AI Text Color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="aiTextColor"
                name="aiTextColor"
                type="color"
                value={colors.aiTextColor}
                onChange={onColorChange}
                className="w-12 h-8"
              />
              <Input
                type="text"
                value={colors.aiTextColor}
                onChange={onColorChange}
                name="aiTextColor"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
