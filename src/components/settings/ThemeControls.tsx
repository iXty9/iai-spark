
import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ThemeColors } from '@/types/theme';
import { Badge } from '@/components/ui/badge';
import { getContrastRatio, getContrastRating, formatContrastRatio, suggestAccessibleColor } from '@/utils/color-contrast';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ThemeControlsProps {
  colors: ThemeColors;
  onColorChange: (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => void;
  isActive?: boolean;
}

// FIXED: Use correct default colors from production theme service
const defaultColors = {
  backgroundColor: '#ffffff',
  primaryColor: '#dd3333',
  textColor: '#000000',
  accentColor: '#9b87f5',
  userBubbleColor: '#dd3333',
  aiBubbleColor: '#9b87f5',
  userBubbleOpacity: 0.3,
  aiBubbleOpacity: 0.3,
  userTextColor: '#000000',
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

const ContrastBadge = React.memo(({ rating }: { rating: 'AAA' | 'AA' | 'Fail' }) => (
  <Badge className={`text-xs ${
    rating === 'AAA' ? 'bg-green-500' : rating === 'AA' ? 'bg-yellow-500' : 'bg-red-500'
  }`}>
    {rating === 'Fail' ? <AlertCircle className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
    {rating}
  </Badge>
));

const ColorInputRow = React.memo(({
  label, name, value, onColorChange, isActive
}: { label: string; name: string; value: string; onColorChange: ThemeControlsProps['onColorChange']; isActive: boolean; }) => {
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange(e);
  }, [onColorChange]);

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">{label}</Label>
      <div className="flex items-center space-x-3">
        <div 
          className="w-8 h-8 rounded-md border-2 cursor-pointer transition-all hover:scale-105" 
          style={{
            backgroundColor: value, 
            borderColor: isActive ? '#ccc' : '#666'
          }} 
          title={`Preview: ${value}`}
        />
        <Input 
          id={name} 
          name={name} 
          type="color" 
          value={value} 
          onChange={handleInputChange} 
          className="w-16 h-8 p-1 cursor-pointer"
          aria-label={`Color picker for ${label}`}
        />
        <Input 
          type="text" 
          value={value} 
          onChange={handleInputChange} 
          name={name} 
          className="flex-1 font-mono text-sm"
          placeholder="#000000"
          pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
          aria-label={`Hex value for ${label}`}
        />
      </div>
    </div>
  );
});

const OpacitySliderRow = React.memo(({
  label, name, value, onChange
}: { label: string; name: string; value: number; onChange: (name: string, value: number) => void; }) => {
  const handleSliderChange = useCallback((val: number[]) => {
    onChange(name, val[0]);
  }, [name, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label htmlFor={name} className="text-sm font-medium">{label}</Label>
        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{Math.round(value * 100)}%</span>
      </div>
      <Slider 
        id={name} 
        min={0.1} 
        max={1} 
        step={0.05} 
        value={[value]} 
        onValueChange={handleSliderChange} 
        className="w-full" 
        aria-label={`${label} slider`}
      />
    </div>
  );
});

const ContrastCheckBlock = React.memo(({
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
}) => {
  const handleApplySuggestion = useCallback(() => {
    if (suggestedColor) {
      onApplySuggestion(colorName, suggestedColor);
    }
  }, [colorName, suggestedColor, onApplySuggestion]);

  return (
    <div className="p-3 border rounded-md bg-card/50">
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium">{title}</span>
        <ContrastBadge rating={rating} />
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        Ratio: {formatContrastRatio(contrast)}
      </div>
      {rating === 'Fail' && suggestedColor && (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-sm border" style={{ backgroundColor: suggestedColor }} />
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs py-1 h-6"
            onClick={handleApplySuggestion}
          >
            Apply suggested color
          </Button>
        </div>
      )}
    </div>
  );
});

export function ThemeControls({ colors, onColorChange, isActive = true }: ThemeControlsProps) {
  const { theme } = useTheme();
  const [showContrastChecks, setShowContrastChecks] = useState(true);

  const applySuggestion = useCallback((name: string, value: string) => {
    onColorChange({ name, value });
  }, [onColorChange]);
  
  // FIXED: Proper slider change handler with useCallback
  const handleSliderChange = useCallback((name: string, value: number) => {
    onColorChange({ name, value });
  }, [onColorChange]);
  
  const c = useMemo(() => ({ ...defaultColors, ...colors }), [colors]);

  // FIXED: Memoize contrast data to prevent unnecessary recalculation
  const contrastData = useMemo(() => contrastLabels.map(({ title, fg, bg }) => {
    const rating = getContrastRating(c[fg], c[bg]);
    const contrastRatio = getContrastRatio(c[fg], c[bg]);
    return {
      title,
      fg: c[fg],
      bg: c[bg],
      rating,
      contrast: contrastRatio,
      colorName: fg,
      suggestedColor: rating === 'Fail' ? suggestAccessibleColor(c[fg], c[bg]) : null
    };
  }), [c]);

  const toggleContrastChecks = useCallback(() => {
    setShowContrastChecks(prev => !prev);
  }, []);

  return (
    <div className={`space-y-6 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
      {/* FIXED: Improved preview with better styling */}
      <div className="p-4 rounded-lg border-2 mb-6 transition-all duration-200" style={{ backgroundColor: c.backgroundColor }}>
        <h3 className="font-medium mb-3 text-lg" style={{ color: c.textColor }}>Theme Preview</h3>
        <div className="flex space-x-3 mb-3">
          {msgConfigs.map(({ bubbleColor, bubbleOpacity, textColor, msgLabel }) => (
            <div
              key={msgLabel}
              className="p-3 rounded-lg flex-1 text-center transition-all duration-200 shadow-sm"
              style={{ 
                backgroundColor: c[bubbleColor], 
                opacity: c[bubbleOpacity], 
                color: c[textColor] 
              }}
            >
              <span className="font-medium">{msgLabel} Message</span>
            </div>
          ))}
        </div>
      </div>

      {/* Improved contrast checks */}
      <div className="p-4 rounded-lg border bg-card/30 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Accessibility Checks</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleContrastChecks}
            className="flex items-center space-x-2"
          >
            {showContrastChecks ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showContrastChecks ? 'Hide' : 'Show'}</span>
          </Button>
        </div>
        {showContrastChecks && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {contrastData.map(item =>
              <ContrastCheckBlock key={item.title} {...item} onApplySuggestion={applySuggestion} />
            )}
          </div>
        )}
      </div>

      {/* Background + Text color */}
      <div className="space-y-4">
        <h4 className="font-medium text-base border-b pb-2">Base Colors</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'backgroundColor', label: 'Background Color' },
            { key: 'textColor', label: 'Default Text Color' }
          ].map(({ key, label }) =>
            <ColorInputRow
              key={key}
              label={label}
              name={key}
              value={c[key]}
              onColorChange={onColorChange}
              isActive={isActive}
            />
          )}
        </div>
      </div>

      {/* Message settings */}
      {msgConfigs.map(({ heading, bubbleColor, bubbleOpacity, textColor, msgLabel }) => (
        <div className="space-y-4" key={heading}>
          <h4 className="font-medium text-base border-b pb-2">{heading}</h4>
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
