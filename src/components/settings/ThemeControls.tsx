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

export interface ThemeControlsProps {
  colors: ThemeColors;
  onColorChange: (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => void;
  isActive?: boolean;
}

const defaultColors = {
  backgroundColor: '#ffffff',
  textColor: '#000000',
  userBubbleColor: '#e5e7eb',
  userBubbleOpacity: 1,
  userTextColor: '#000000',
  aiBubbleColor: '#f3f4f6',
  aiBubbleOpacity: 1,
  aiTextColor: '#000000',
};

function ContrastBadge({ rating }: { rating: 'AAA' | 'AA' | 'Fail' }) {
  const color =
    rating === 'AAA' ? 'bg-green-500' : rating === 'AA' ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <Badge className={`text-xs ${color}`}>
      {rating === 'Fail' ? <AlertCircle className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
      {rating}
    </Badge>
  );
}

function ColorInputRow({
  label,
  name,
  value,
  onColorChange,
  isActive,
}: {
  label: string;
  name: string;
  value: string;
  onColorChange: ThemeControlsProps['onColorChange'];
  isActive: boolean;
}) {
  const previewStyle = {
    backgroundColor: value,
    border: isActive ? '1px solid #ccc' : '1px solid #333',
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 rounded-md" style={previewStyle}></div>
        <Input
          id={name}
          name={name}
          type="color"
          value={value}
          onChange={onColorChange}
          className="w-12 h-8"
        />
        <Input
          type="text"
          value={value}
          onChange={onColorChange}
          name={name}
          className="flex-1"
        />
      </div>
    </div>
  );
}

function OpacitySliderRow({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (name: string, value: number[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label htmlFor={name}>{label}</Label>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <Slider
        id={name}
        min={0.1}
        max={1}
        step={0.05}
        value={[value]}
        onValueChange={(val) => onChange(name, val)}
        className="w-full"
      />
    </div>
  );
}

function ContrastCheckBlock({
  title,
  fg,
  bg,
  rating,
  contrast,
  suggestedColor,
  onApplySuggestion,
  colorName,
}: {
  title: string;
  fg: string;
  bg: string;
  rating: 'AAA' | 'AA' | 'Fail';
  contrast: number;
  suggestedColor?: string | null;
  onApplySuggestion: (colorName: string, suggestedColor: string) => void;
  colorName: string;
}) {
  return (
    <div className="p-2 border rounded-md">
      <div className="flex justify-between">
        <span>{title}</span>
        <ContrastBadge rating={rating} />
      </div>
      <div className="text-xs mt-1">
        Ratio: {formatContrastRatio(contrast)}
      </div>
      {suggestedColor && (
        <div className="flex items-center mt-2">
          <div
            className="w-4 h-4 rounded-sm mr-1"
            style={{ backgroundColor: suggestedColor }}
          ></div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs py-1 h-6"
            onClick={() => onApplySuggestion(colorName, suggestedColor)}
          >
            Apply suggested color
          </Button>
        </div>
      )}
    </div>
  );
}

// MAIN COMPONENT
export function ThemeControls({ colors, onColorChange, isActive = true }: ThemeControlsProps) {
  const { theme } = useTheme();
  const [showContrastChecks, setShowContrastChecks] = useState(true);

  const applySuggestion = (name: string, value: string) => onColorChange({ name, value });
  const handleSliderChange = (name: string, value: number[]) =>
    onColorChange({ name, value: value[0] });

  // Merge with defaults to avoid type errors/missing keys
  const c = { ...defaultColors, ...colors };

  // Contrast checks
  const contrastData = [
    {
      title: 'Text on Background',
      fg: c.textColor,
      bg: c.backgroundColor,
      rating: getContrastRating(c.textColor, c.backgroundColor),
      contrast: getContrastRatio(c.textColor, c.backgroundColor),
      colorName: 'textColor',
      suggestedColor: null as string | null,
    },
    {
      title: 'User Text',
      fg: c.userTextColor,
      bg: c.userBubbleColor,
      rating: getContrastRating(c.userTextColor, c.userBubbleColor),
      contrast: getContrastRatio(c.userTextColor, c.userBubbleColor),
      colorName: 'userTextColor',
      suggestedColor: null as string | null,
    },
    {
      title: 'AI Text',
      fg: c.aiTextColor,
      bg: c.aiBubbleColor,
      rating: getContrastRating(c.aiTextColor, c.aiBubbleColor),
      contrast: getContrastRatio(c.aiTextColor, c.aiBubbleColor),
      colorName: 'aiTextColor',
      suggestedColor: null as string | null,
    },
  ];
  // Calculate suggested colors if "Fail"
  contrastData.forEach((item) => {
    if (item.rating === 'Fail')
      item.suggestedColor = suggestAccessibleColor(item.fg, item.bg);
  });

  return (
    <div className={`space-y-6 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
      {/* Preview */}
      <div className="p-3 rounded-md border mb-4" style={{ backgroundColor: c.backgroundColor }}>
        <h3 className="font-medium mb-2" style={{ color: c.textColor }}>Theme Preview</h3>
        <div className="flex space-x-2 mb-2">
          <div
            className="p-2 rounded-lg flex-1 text-center"
            style={{ backgroundColor: c.userBubbleColor, opacity: c.userBubbleOpacity, color: c.userTextColor }}
          >User Message</div>
          <div
            className="p-2 rounded-lg flex-1 text-center"
            style={{ backgroundColor: c.aiBubbleColor, opacity: c.aiBubbleOpacity, color: c.aiTextColor }}
          >AI Message</div>
        </div>
      </div>

      {/* Contrast checks */}
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
            {contrastData.map((item) => (
              <ContrastCheckBlock
                key={item.title}
                {...item}
                onApplySuggestion={applySuggestion}
              />
            ))}
          </div>
        </div>
      )}

      {/* Background + Text color */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ColorInputRow
          label="Background Color"
          name="backgroundColor"
          value={c.backgroundColor}
          onColorChange={onColorChange}
          isActive={isActive}
        />
        <ColorInputRow
          label="Default Text Color"
          name="textColor"
          value={c.textColor}
          onColorChange={onColorChange}
          isActive={isActive}
        />
      </div>

      {/* User message settings */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">User Message Settings</h4>
        <div className="space-y-4">
          <ColorInputRow
            label="User Message Color"
            name="userBubbleColor"
            value={c.userBubbleColor}
            onColorChange={onColorChange}
            isActive={isActive}
          />
          <OpacitySliderRow
            label="User Message Opacity"
            name="userBubbleOpacity"
            value={c.userBubbleOpacity}
            onChange={handleSliderChange}
          />
          <ColorInputRow
            label="User Text Color"
            name="userTextColor"
            value={c.userTextColor}
            onColorChange={onColorChange}
            isActive={isActive}
          />
        </div>
      </div>

      {/* AI message settings */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">AI Message Settings</h4>
        <div className="space-y-4">
          <ColorInputRow
            label="AI Message Color"
            name="aiBubbleColor"
            value={c.aiBubbleColor}
            onColorChange={onColorChange}
            isActive={isActive}
          />
          <OpacitySliderRow
            label="AI Message Opacity"
            name="aiBubbleOpacity"
            value={c.aiBubbleOpacity}
            onChange={handleSliderChange}
          />
          <ColorInputRow
            label="AI Text Color"
            name="aiTextColor"
            value={c.aiTextColor}
            onColorChange={onColorChange}
            isActive={isActive}
          />
        </div>
      </div>
    </div>
  );
}