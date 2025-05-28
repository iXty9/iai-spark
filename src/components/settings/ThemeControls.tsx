import React, { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ThemeColors } from '@/types/theme';
import { Badge } from '@/components/ui/badge';
import { getContrastRatio, getContrastRating, formatContrastRatio, suggestAccessibleColor } from '@/utils/color-contrast';
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

const contrastLabels = [
  { title: 'Text on Background', fg: 'textColor', bg: 'backgroundColor' },
  { title: 'User Text', fg: 'userTextColor', bg: 'userBubbleColor' },
  { title: 'AI Text', fg: 'aiTextColor', bg: 'aiBubbleColor' },
];

const msgConfigs = [
  {
    heading: 'User Message Settings',
    bubbleColor: 'userBubbleColor',
    bubbleOpacity: 'userBubbleOpacity',
    textColor: 'userTextColor',
    msgLabel: 'User'
  },
  {
    heading: 'AI Message Settings',
    bubbleColor: 'aiBubbleColor',
    bubbleOpacity: 'aiBubbleOpacity',
    textColor: 'aiTextColor',
    msgLabel: 'AI'
  }
];

const ContrastBadge = ({ rating }: { rating: 'AAA' | 'AA' | 'Fail' }) => (
  <Badge className={`text-xs ${
    rating === 'AAA' ? 'bg-green-500' : rating === 'AA' ? 'bg-yellow-500' : 'bg-red-500'
  }`}>
    {rating === 'Fail' ? <AlertCircle className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
    {rating}
  </Badge>
);

const ColorInputRow = ({
  label, name, value, onColorChange, isActive
}: { label: string; name: string; value: string; onColorChange: ThemeControlsProps['onColorChange']; isActive: boolean; }) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <div className="flex items-center space-x-2">
      <div className="w-6 h-6 rounded-md" style={{
        backgroundColor: value, border: isActive ? '1px solid #ccc' : '1px solid #333'
      }} />
      <Input id={name} name={name} type="color" value={value} onChange={onColorChange} className="w-12 h-8"/>
      <Input type="text" value={value} onChange={onColorChange} name={name} className="flex-1"/>
    </div>
  </div>
);

const OpacitySliderRow = ({
  label, name, value, onChange
}: { label: string; name: string; value: number; onChange: (name: string, value: number[]) => void; }) => (
  <div className="space-y-2">
    <div className="flex justify-between">
      <Label htmlFor={name}>{label}</Label>
      <span>{Math.round(value * 100)}%</span>
    </div>
    <Slider id={name} min={0.1} max={1} step={0.05} value={[value]} onValueChange={val => onChange(name, val)} className="w-full" />
  </div>
);

const ContrastCheckBlock = ({
  title, fg, bg, rating, contrast, suggestedColor, onApplySuggestion, colorName
}: {
  title: string;
  fg: string;
  bg: string;
  rating: 'AAA' | 'AA' | 'Fail';
  contrast: number;
  suggestedColor?: string | null;
  onApplySuggestion: (colorName: string, suggestedColor: string) => void;
  colorName: string;
}) => (
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
        <div className="w-4 h-4 rounded-sm mr-1" style={{ backgroundColor: suggestedColor }} />
        <Button size="sm" variant="outline" className="text-xs py-1 h-6"
          onClick={() => onApplySuggestion(colorName, suggestedColor)}>
          Apply suggested color
        </Button>
      </div>
    )}
  </div>
);

export function ThemeControls({ colors, onColorChange, isActive = true }: ThemeControlsProps) {
  const { theme } = useTheme();
  const [showContrastChecks, setShowContrastChecks] = useState(true);

  const applySuggestion = (name: string, value: string) => onColorChange({ name, value });
  const handleSliderChange = (name: string, value: number[]) => onColorChange({ name, value: value[0] });
  const c = { ...defaultColors, ...colors };

  // Generate contrast data & suggestions in one pass
  const contrastData = contrastLabels.map(({ title, fg, bg }) => {
    const rating = getContrastRating(c[fg], c[bg]);
    return {
      title,
      fg: c[fg],
      bg: c[bg],
      rating,
      contrast: getContrastRatio(c[fg], c[bg]),
      colorName: fg,
      suggestedColor: rating === 'Fail' ? suggestAccessibleColor(c[fg], c[bg]) : null
    };
  });

  return (
    <div className={`space-y-6 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
      {/* Preview */}
      <div className="p-3 rounded-md border mb-4" style={{ backgroundColor: c.backgroundColor }}>
        <h3 className="font-medium mb-2" style={{ color: c.textColor }}>Theme Preview</h3>
        <div className="flex space-x-2 mb-2">
          {msgConfigs.map(({ bubbleColor, bubbleOpacity, textColor, msgLabel }) => (
            <div
              key={msgLabel}
              className="p-2 rounded-lg flex-1 text-center"
              style={{ backgroundColor: c[bubbleColor], opacity: c[bubbleOpacity], color: c[textColor] }}
            >
              {msgLabel} Message
            </div>
          ))}
        </div>
      </div>

      {/* Contrast checks */}
      {showContrastChecks && (
        <div className="p-3 rounded-md border mb-4 space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Accessibility Checks</h3>
            <Button variant="outline" size="sm" onClick={() => setShowContrastChecks(false)}>
              Hide
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {contrastData.map(item =>
              <ContrastCheckBlock key={item.title} {...item} onApplySuggestion={applySuggestion} />
            )}
          </div>
        </div>
      )}

      {/* Background + Text color */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['backgroundColor', 'textColor'].map(key =>
          <ColorInputRow
            key={key}
            label={key === 'backgroundColor' ? 'Background Color' : 'Default Text Color'}
            name={key}
            value={c[key]}
            onColorChange={onColorChange}
            isActive={isActive}
          />
        )}
      </div>

      {/* Message settings */}
      {msgConfigs.map(({ heading, bubbleColor, bubbleOpacity, textColor, msgLabel }) => (
        <div className="border-t pt-4 mt-4" key={heading}>
          <h4 className="font-medium mb-3">{heading}</h4>
          <div className="space-y-4">
            <ColorInputRow
              label={`${msgLabel} Message Color`}
              name={bubbleColor}
              value={c[bubbleColor]}
              onColorChange={onColorChange}
              isActive={isActive}
            />
            <OpacitySliderRow
              label={`${msgLabel} Message Opacity`}
              name={bubbleOpacity}
              value={c[bubbleOpacity]}
              onChange={handleSliderChange}
            />
            <ColorInputRow
              label={`${msgLabel} Text Color`}
              name={textColor}
              value={c[textColor]}
              onColorChange={onColorChange}
              isActive={isActive}
            />
          </div>
        </div>
      ))}
    </div>
  );
}