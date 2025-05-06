
import React, { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ThemeColors } from '@/types/theme';
import { Badge } from '@/components/ui/badge';
import { 
  getContrastRatio, 
  getContrastRating, 
  formatContrastRatio,
  suggestAccessibleColor
} from '@/utils/color-contrast';
import { AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ThemeControlsProps {
  colors: ThemeColors;
  onColorChange: (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => void;
  isActive?: boolean;
}

export function ThemeControls({ colors, onColorChange, isActive = true }: ThemeControlsProps) {
  const { theme } = useTheme();
  const [showContrastChecks, setShowContrastChecks] = useState<boolean>(true);
  
  const handleSliderChange = (name: string, value: number[]) => {
    onColorChange({ name, value: value[0] });
  };

  const getPreviewStyle = (color: string) => {
    return {
      backgroundColor: color,
      border: isActive ? '1px solid #ccc' : '1px solid #333'
    };
  };

  // Apply suggested accessible color
  const handleApplySuggestion = (colorName: string, suggestedColor: string) => {
    onColorChange({ name: colorName, value: suggestedColor });
  };
  
  // Ensure colors object has all required properties with fallbacks
  const safeColors = {
    backgroundColor: colors?.backgroundColor || '#ffffff',
    textColor: colors?.textColor || '#000000',
    userBubbleColor: colors?.userBubbleColor || '#e5e7eb',
    userBubbleOpacity: colors?.userBubbleOpacity || 1,
    userTextColor: colors?.userTextColor || '#000000',
    aiBubbleColor: colors?.aiBubbleColor || '#f3f4f6',
    aiBubbleOpacity: colors?.aiBubbleOpacity || 1,
    aiTextColor: colors?.aiTextColor || '#000000',
    ...colors
  };
  
  // Color contrast checks
  const textOnBgContrast = getContrastRatio(safeColors.textColor, safeColors.backgroundColor);
  const textOnBgRating = getContrastRating(safeColors.textColor, safeColors.backgroundColor);
  
  const userTextOnBubbleContrast = getContrastRatio(
    safeColors.userTextColor, 
    safeColors.userBubbleColor
  );
  const userTextRating = getContrastRating(
    safeColors.userTextColor, 
    safeColors.userBubbleColor
  );
  
  const aiTextOnBubbleContrast = getContrastRatio(
    safeColors.aiTextColor, 
    safeColors.aiBubbleColor
  );
  const aiTextRating = getContrastRating(
    safeColors.aiTextColor, 
    safeColors.aiBubbleColor
  );

  // Suggested accessible colors
  const suggestedTextColor = textOnBgRating === 'Fail' ? 
    suggestAccessibleColor(safeColors.textColor, safeColors.backgroundColor) : null;
  
  const suggestedUserTextColor = userTextRating === 'Fail' ?
    suggestAccessibleColor(safeColors.userTextColor, safeColors.userBubbleColor) : null;
    
  const suggestedAiTextColor = aiTextRating === 'Fail' ?
    suggestAccessibleColor(safeColors.aiTextColor, safeColors.aiBubbleColor) : null;

  const ContrastBadge = ({ rating }: { rating: 'AAA' | 'AA' | 'Fail' }) => {
    let color = 'bg-red-500';
    if (rating === 'AAA') color = 'bg-green-500';
    else if (rating === 'AA') color = 'bg-yellow-500';
    
    return (
      <Badge className={`text-xs ${color}`}>
        {rating === 'Fail' ? <AlertCircle className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
        {rating}
      </Badge>
    );
  };

  return (
    <div className={`space-y-6 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
      <div className="p-3 rounded-md border mb-4" style={{ backgroundColor: safeColors.backgroundColor }}>
        <h3 className="font-medium mb-2" style={{ color: safeColors.textColor }}>Theme Preview</h3>
        <div className="flex space-x-2 mb-2">
          <div 
            className="p-2 rounded-lg flex-1 text-center"
            style={{ 
              backgroundColor: safeColors.userBubbleColor,
              opacity: safeColors.userBubbleOpacity,
              color: safeColors.userTextColor
            }}
          >
            User Message
          </div>
          <div 
            className="p-2 rounded-lg flex-1 text-center"
            style={{ 
              backgroundColor: safeColors.aiBubbleColor,
              opacity: safeColors.aiBubbleOpacity,
              color: safeColors.aiTextColor
            }}
          >
            AI Message
          </div>
        </div>
      </div>
      
      {showContrastChecks && (
        <div className="p-3 rounded-md border mb-4 space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Accessibility Checks</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowContrastChecks(false)}
            >
              Hide
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="p-2 border rounded-md">
              <div className="flex justify-between">
                <span>Text on Background</span>
                <ContrastBadge rating={textOnBgRating} />
              </div>
              <div className="text-xs mt-1">
                Ratio: {formatContrastRatio(textOnBgContrast)}
              </div>
              {suggestedTextColor && (
                <div className="flex items-center mt-2">
                  <div 
                    className="w-4 h-4 rounded-sm mr-1"
                    style={{ backgroundColor: suggestedTextColor }}
                  ></div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs py-1 h-6"
                    onClick={() => handleApplySuggestion('textColor', suggestedTextColor)}
                  >
                    Apply suggested color
                  </Button>
                </div>
              )}
            </div>
            
            <div className="p-2 border rounded-md">
              <div className="flex justify-between">
                <span>User Text</span>
                <ContrastBadge rating={userTextRating} />
              </div>
              <div className="text-xs mt-1">
                Ratio: {formatContrastRatio(userTextOnBubbleContrast)}
              </div>
              {suggestedUserTextColor && (
                <div className="flex items-center mt-2">
                  <div 
                    className="w-4 h-4 rounded-sm mr-1"
                    style={{ backgroundColor: suggestedUserTextColor }}
                  ></div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs py-1 h-6"
                    onClick={() => handleApplySuggestion('userTextColor', suggestedUserTextColor)}
                  >
                    Apply suggested color
                  </Button>
                </div>
              )}
            </div>
            
            <div className="p-2 border rounded-md">
              <div className="flex justify-between">
                <span>AI Text</span>
                <ContrastBadge rating={aiTextRating} />
              </div>
              <div className="text-xs mt-1">
                Ratio: {formatContrastRatio(aiTextOnBubbleContrast)}
              </div>
              {suggestedAiTextColor && (
                <div className="flex items-center mt-2">
                  <div 
                    className="w-4 h-4 rounded-sm mr-1"
                    style={{ backgroundColor: suggestedAiTextColor }}
                  ></div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs py-1 h-6"
                    onClick={() => handleApplySuggestion('aiTextColor', suggestedAiTextColor)}
                  >
                    Apply suggested color
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="backgroundColor">Background Color</Label>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md" style={getPreviewStyle(safeColors.backgroundColor)}></div>
            <Input
              id="backgroundColor"
              name="backgroundColor"
              type="color"
              value={safeColors.backgroundColor}
              onChange={onColorChange}
              className="w-12 h-8"
            />
            <Input
              type="text"
              value={safeColors.backgroundColor}
              onChange={onColorChange}
              name="backgroundColor"
              className="flex-1"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="textColor">Default Text Color</Label>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md" style={getPreviewStyle(safeColors.textColor)}></div>
            <Input
              id="textColor"
              name="textColor"
              type="color"
              value={safeColors.textColor}
              onChange={onColorChange}
              className="w-12 h-8"
            />
            <Input
              type="text"
              value={safeColors.textColor}
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
              <div className="w-6 h-6 rounded-md" style={getPreviewStyle(safeColors.userBubbleColor)}></div>
              <Input
                id="userBubbleColor"
                name="userBubbleColor"
                type="color"
                value={safeColors.userBubbleColor}
                onChange={onColorChange}
                className="w-12 h-8"
              />
              <Input
                type="text"
                value={safeColors.userBubbleColor}
                onChange={onColorChange}
                name="userBubbleColor"
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="userBubbleOpacity">User Message Opacity</Label>
              <span>{Math.round(safeColors.userBubbleOpacity * 100)}%</span>
            </div>
            <Slider
              id="userBubbleOpacity"
              min={0.1}
              max={1}
              step={0.05}
              value={[safeColors.userBubbleOpacity]}
              onValueChange={(value) => handleSliderChange('userBubbleOpacity', value)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="userTextColor">User Text Color</Label>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md" style={getPreviewStyle(safeColors.userTextColor)}></div>
              <Input
                id="userTextColor"
                name="userTextColor"
                type="color"
                value={safeColors.userTextColor}
                onChange={onColorChange}
                className="w-12 h-8"
              />
              <Input
                type="text"
                value={safeColors.userTextColor}
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
              <div className="w-6 h-6 rounded-md" style={getPreviewStyle(safeColors.aiBubbleColor)}></div>
              <Input
                id="aiBubbleColor"
                name="aiBubbleColor"
                type="color"
                value={safeColors.aiBubbleColor}
                onChange={onColorChange}
                className="w-12 h-8"
              />
              <Input
                type="text"
                value={safeColors.aiBubbleColor}
                onChange={onColorChange}
                name="aiBubbleColor"
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="aiBubbleOpacity">AI Message Opacity</Label>
              <span>{Math.round(safeColors.aiBubbleOpacity * 100)}%</span>
            </div>
            <Slider
              id="aiBubbleOpacity"
              min={0.1}
              max={1}
              step={0.05}
              value={[safeColors.aiBubbleOpacity]}
              onValueChange={(value) => handleSliderChange('aiBubbleOpacity', value)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="aiTextColor">AI Text Color</Label>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md" style={getPreviewStyle(safeColors.aiTextColor)}></div>
              <Input
                id="aiTextColor"
                name="aiTextColor"
                type="color"
                value={safeColors.aiTextColor}
                onChange={onColorChange}
                className="w-12 h-8"
              />
              <Input
                type="text"
                value={safeColors.aiTextColor}
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
