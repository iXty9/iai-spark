
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

interface ThemeControlsProps {
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
  
  // Color contrast checks
  const textOnBgContrast = getContrastRatio(colors.textColor, colors.backgroundColor);
  const textOnBgRating = getContrastRating(colors.textColor, colors.backgroundColor);
  
  const userTextOnBubbleContrast = getContrastRatio(
    colors.userTextColor, 
    colors.userBubbleColor
  );
  const userTextRating = getContrastRating(
    colors.userTextColor, 
    colors.userBubbleColor
  );
  
  const aiTextOnBubbleContrast = getContrastRatio(
    colors.aiTextColor, 
    colors.aiBubbleColor
  );
  const aiTextRating = getContrastRating(
    colors.aiTextColor, 
    colors.aiBubbleColor
  );

  // Suggested accessible colors
  const suggestedTextColor = textOnBgRating === 'Fail' ? 
    suggestAccessibleColor(colors.textColor, colors.backgroundColor) : null;
  
  const suggestedUserTextColor = userTextRating === 'Fail' ?
    suggestAccessibleColor(colors.userTextColor, colors.userBubbleColor) : null;
    
  const suggestedAiTextColor = aiTextRating === 'Fail' ?
    suggestAccessibleColor(colors.aiTextColor, colors.aiBubbleColor) : null;

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
      <div className="p-3 rounded-md border mb-4" style={{ backgroundColor: colors.backgroundColor }}>
        <h3 className="font-medium mb-2" style={{ color: colors.textColor }}>Theme Preview</h3>
        <div className="flex space-x-2 mb-2">
          <div 
            className="p-2 rounded-lg flex-1 text-center"
            style={{ 
              backgroundColor: colors.userBubbleColor,
              opacity: colors.userBubbleOpacity,
              color: colors.userTextColor
            }}
          >
            User Message
          </div>
          <div 
            className="p-2 rounded-lg flex-1 text-center"
            style={{ 
              backgroundColor: colors.aiBubbleColor,
              opacity: colors.aiBubbleOpacity,
              color: colors.aiTextColor
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
            <div className="w-6 h-6 rounded-md" style={getPreviewStyle(colors.backgroundColor)}></div>
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
            <div className="w-6 h-6 rounded-md" style={getPreviewStyle(colors.textColor)}></div>
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
              <div className="w-6 h-6 rounded-md" style={getPreviewStyle(colors.userBubbleColor)}></div>
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
              <div className="w-6 h-6 rounded-md" style={getPreviewStyle(colors.userTextColor)}></div>
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
              <div className="w-6 h-6 rounded-md" style={getPreviewStyle(colors.aiBubbleColor)}></div>
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
              <div className="w-6 h-6 rounded-md" style={getPreviewStyle(colors.aiTextColor)}></div>
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
