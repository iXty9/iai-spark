import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from '@/contexts/SupaThemeContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ThemeColors } from '@/types/theme';
import { Badge } from '@/components/ui/badge';
import { getContrastRatio, getContrastRating, formatContrastRatio, suggestAccessibleColor } from '@/utils/color-contrast';
import { AlertCircle, Check, Eye, EyeOff, Palette, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ThemeControlsProps {
  colors: ThemeColors;
  onColorChange: (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => void;
  isActive?: boolean;
}

// Use correct default colors from production theme service
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
  userNameColor: '#666666',
  aiNameColor: '#666666',
  proactiveHighlightColor: '#3b82f6',
};

const contrastLabels = [
  { title: 'Text on Background', fg: 'textColor', bg: 'backgroundColor' },
  { title: 'User Text', fg: 'userTextColor', bg: 'userBubbleColor' },
  { title: 'AI Text', fg: 'aiTextColor', bg: 'aiBubbleColor' },
  { title: 'User Name on Background', fg: 'userNameColor', bg: 'backgroundColor' },
  { title: 'AI Name on Background', fg: 'aiNameColor', bg: 'backgroundColor' },
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
    rating === 'AAA' ? 'bg-green-500 text-white' : rating === 'AA' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
  }`}>
    {rating === 'Fail' ? <AlertCircle className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
    {rating}
  </Badge>
));

const ColorInputRow = React.memo(({
  label, name, value, onColorChange, isActive, icon
}: { 
  label: string; 
  name: string; 
  value: string; 
  onColorChange: ThemeControlsProps['onColorChange']; 
  isActive: boolean;
  icon?: React.ReactNode;
}) => {
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange(e);
  }, [onColorChange]);

  return (
    <div className="space-y-3 group">
      <Label htmlFor={name} className="text-sm font-medium flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <div className="flex items-center space-x-4 p-3 rounded-lg border border-border/20 bg-card/60 hover:bg-card/80 transition-all duration-200">
        <div 
          className="w-10 h-10 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 shadow-sm" 
          style={{
            backgroundColor: value, 
            borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'
          }} 
          title={`Preview: ${value}`}
        />
        <Input 
          id={name} 
          name={name} 
          type="color" 
          value={value} 
          onChange={handleInputChange} 
          className="w-12 h-10 p-1 cursor-pointer border-border/20"
          aria-label={`Color picker for ${label}`}
        />
        <Input 
          type="text" 
          value={value} 
          onChange={handleInputChange} 
          name={name} 
          className="flex-1 font-mono text-sm bg-background/50 border-border/20"
          placeholder="#000000"
          pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
          aria-label={`Hex value for ${label}`}
        />
      </div>
    </div>
  );
});

const OpacitySliderRow = React.memo(({
  label, name, value, onChange, icon
}: { 
  label: string; 
  name: string; 
  value: number; 
  onChange: (name: string, value: number) => void;
  icon?: React.ReactNode;
}) => {
  const handleSliderChange = useCallback((val: number[]) => {
    onChange(name, val[0]);
  }, [name, onChange]);

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border/20 bg-card/60">
      <div className="flex justify-between items-center">
        <Label htmlFor={name} className="text-sm font-medium flex items-center gap-2">
          {icon}
          {label}
        </Label>
        <div className="bg-primary/20 px-3 py-1 rounded-md border border-border/20">
          <span className="text-sm font-mono font-semibold">{Math.round(value * 100)}%</span>
        </div>
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
  const [showContrastChecks, setShowContrastChecks] = useState(false);

  const applySuggestion = useCallback((name: string, value: string) => {
    onColorChange({ name, value });
  }, [onColorChange]);
  
  const handleSliderChange = useCallback((name: string, value: number) => {
    onColorChange({ name, value });
  }, [onColorChange]);
  
  const c = useMemo(() => ({ ...defaultColors, ...colors }), [colors]);

  // Memoize contrast data to prevent unnecessary recalculation
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
    <div className="space-y-8">
      {/* Enhanced Theme Preview */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border/30 bg-card/80 p-6 shadow-lg" style={{ backgroundColor: c.backgroundColor }}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
        <div className="relative">
          <h3 className="font-semibold mb-4 text-lg flex items-center gap-2" style={{ color: c.textColor }}>
            <Palette className="h-5 w-5" />
            Live Theme Preview
          </h3>
          <div className="space-y-4">
            {/* Name tag preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-xs font-medium" style={{ color: c.userNameColor }}>
                User Name Preview
              </div>
              <div className="text-xs font-medium" style={{ color: c.aiNameColor }}>
                AI Name Preview
              </div>
            </div>
            {/* Message bubbles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {msgConfigs.map(({ bubbleColor, bubbleOpacity, textColor, msgLabel }) => (
                <div
                  key={msgLabel}
                  className="p-4 rounded-xl flex items-center justify-center text-center transition-all duration-300 hover:scale-105 shadow-md border border-border/20"
                  style={{ 
                    backgroundColor: c[bubbleColor], 
                    opacity: c[bubbleOpacity], 
                    color: c[textColor] 
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium">{msgLabel} Message</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Proactive message preview */}
            <div className="mt-4">
              <div className="text-xs font-medium mb-2" style={{ color: c.aiNameColor }}>
                Proactive Message Preview
              </div>
              <div
                className="p-4 rounded-xl flex items-center justify-center text-center transition-all duration-300 hover:scale-105 shadow-md border-l-4"
                style={{ 
                  backgroundColor: c.aiBubbleColor, 
                  opacity: c.aiBubbleOpacity, 
                  color: c.aiTextColor,
                  borderLeftColor: c.proactiveHighlightColor
                }}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">Proactive AI Message</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Enhanced Color Sections */}
      <div className="space-y-6">
        <div className="bg-card/60 rounded-xl p-6 border border-border/20 space-y-6">
          <h4 className="font-semibold text-lg border-b border-border/30 pb-3 flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Base Colors
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ColorInputRow
              label="Background Color"
              name="backgroundColor"
              value={c.backgroundColor}
              onColorChange={onColorChange}
              isActive={isActive}
              icon={<div className="w-3 h-3 rounded-full bg-background border border-border"></div>}
            />
            <ColorInputRow
              label="Text Color"
              name="textColor"
              value={c.textColor}
              onColorChange={onColorChange}
              isActive={isActive}
              icon={<div className="w-3 h-3 rounded-full bg-foreground"></div>}
            />
          </div>
        </div>

        {/* NEW: Proactive Message Settings Section */}
        <div className="bg-card/60 rounded-xl p-6 border border-border/20 space-y-6">
          <h4 className="font-semibold text-lg border-b border-border/30 pb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Proactive Message Settings
          </h4>
          <ColorInputRow
            label="Proactive Highlight Color"
            name="proactiveHighlightColor"
            value={c.proactiveHighlightColor}
            onColorChange={onColorChange}
            isActive={isActive}
            icon={<div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.proactiveHighlightColor }}></div>}
          />
        </div>

        {/* NEW: Name Tag Colors Section */}
        <div className="bg-card/60 rounded-xl p-6 border border-border/20 space-y-6">
          <h4 className="font-semibold text-lg border-b border-border/30 pb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Name Tag Colors
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ColorInputRow
              label="User Name Color"
              name="userNameColor"
              value={c.userNameColor}
              onColorChange={onColorChange}
              isActive={isActive}
              icon={<div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.userNameColor }}></div>}
            />
            <ColorInputRow
              label="AI Name Color"
              name="aiNameColor"
              value={c.aiNameColor}
              onColorChange={onColorChange}
              isActive={isActive}
              icon={<div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.aiNameColor }}></div>}
            />
          </div>
        </div>

        {/* Enhanced Message Settings */}
        {msgConfigs.map(({ heading, bubbleColor, bubbleOpacity, textColor, msgLabel }) => (
          <div className="bg-card/60 rounded-xl p-6 border border-border/20 space-y-6" key={heading}>
            <h4 className="font-semibold text-lg border-b border-border/30 pb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {heading}
            </h4>
            <div className="space-y-6">
              <ColorInputRow
                label={`${msgLabel} Message Color`}
                name={bubbleColor}
                value={c[bubbleColor]}
                onColorChange={onColorChange}
                isActive={isActive}
                icon={<div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c[bubbleColor] }}></div>}
              />
              <OpacitySliderRow
                label={`${msgLabel} Message Opacity`}
                name={bubbleOpacity}
                value={c[bubbleOpacity]}
                onChange={handleSliderChange}
                icon={<div className="w-3 h-3 rounded-full bg-muted border border-border"></div>}
              />
              <ColorInputRow
                label={`${msgLabel} Text Color`}
                name={textColor}
                value={c[textColor]}
                onColorChange={onColorChange}
                isActive={isActive}
                icon={<div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c[textColor] }}></div>}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Accessibility Checks - Moved to bottom */}
      <div className="bg-muted/20 rounded-xl p-6 border border-border/20 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Accessibility Checks
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleContrastChecks}
            className="flex items-center space-x-2 hover:bg-muted/30 transition-all duration-200"
          >
            {showContrastChecks ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showContrastChecks ? 'Hide' : 'Show'}</span>
          </Button>
        </div>
        {showContrastChecks && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contrastData.map(item =>
              <ContrastCheckBlock key={item.title} {...item} onApplySuggestion={applySuggestion} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
