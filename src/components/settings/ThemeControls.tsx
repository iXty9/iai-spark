import React, { useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ThemeColors } from '@/types/theme';
import { MessageSquare, User, Bot, Sparkles } from 'lucide-react';

export interface ThemeControlsProps {
  colors: ThemeColors;
  onColorChange: (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => void;
  isActive?: boolean;
  backgroundImage?: string | null;
  backgroundOpacity?: number;
}

// Default colors from production theme service
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

// Simplified color input - single picker that acts as both preview and picker
const ColorInput = React.memo(({
  label, name, value, onColorChange
}: { 
  label: string; 
  name: string; 
  value: string; 
  onColorChange: ThemeControlsProps['onColorChange']; 
}) => {
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange(e);
  }, [onColorChange]);

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input 
          id={name} 
          name={name} 
          type="color" 
          value={value} 
          onChange={handleInputChange} 
          className="w-10 h-10 p-1 cursor-pointer rounded-lg border-2 border-border/30 hover:border-primary/50 transition-colors"
          aria-label={`Color picker for ${label}`}
        />
        <Input 
          type="text" 
          value={value} 
          onChange={handleInputChange} 
          name={name} 
          className="flex-1 font-mono text-xs h-10 bg-background/50 border-border/30"
          placeholder="#000000"
          pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
          aria-label={`Hex value for ${label}`}
        />
      </div>
    </div>
  );
});

// Opacity slider component
const OpacitySlider = React.memo(({
  label, name, value, onChange
}: { 
  label: string; 
  name: string; 
  value: number; 
  onChange: (name: string, value: number) => void;
}) => {
  const handleSliderChange = useCallback((val: number[]) => {
    onChange(name, val[0]);
  }, [name, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label htmlFor={name} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
          {Math.round(value * 100)}%
        </span>
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

export function ThemeControls({ colors, onColorChange, isActive = true, backgroundImage, backgroundOpacity = 1 }: ThemeControlsProps) {
  const handleSliderChange = useCallback((name: string, value: number) => {
    onColorChange({ name, value });
  }, [onColorChange]);
  
  const c = useMemo(() => ({ ...defaultColors, ...colors }), [colors]);

  return (
    <div className="space-y-6">
      {/* Mini Chat Preview */}
      <div className="rounded-xl border border-border/30 overflow-hidden bg-muted/20">
        <div className="px-4 py-2 border-b border-border/20 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Preview
          </div>
        </div>
        <div 
          className="p-4 space-y-3 min-h-[160px] relative"
          style={{ backgroundColor: c.backgroundColor }}
        >
          {/* Background Image Layer */}
          {backgroundImage && (
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
              style={{ 
                backgroundImage: `url(${backgroundImage})`,
                opacity: backgroundOpacity
              }}
            />
          )}
          {/* AI Message */}
          <div className="flex gap-2 items-start max-w-[85%] relative z-10">
            <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <span className="text-[10px] font-medium mb-1 block" style={{ color: c.aiNameColor }}>
                Assistant
              </span>
              <div
                className="px-3 py-2 rounded-2xl rounded-tl-sm text-sm"
                style={{ 
                  backgroundColor: c.aiBubbleColor, 
                  opacity: c.aiBubbleOpacity, 
                  color: c.aiTextColor 
                }}
              >
                Hello! How can I help you today?
              </div>
            </div>
          </div>
          
          {/* User Message */}
          <div className="flex gap-2 items-start justify-end max-w-[85%] ml-auto relative z-10">
            <div className="text-right">
              <span className="text-[10px] font-medium mb-1 block" style={{ color: c.userNameColor }}>
                You
              </span>
              <div
                className="px-3 py-2 rounded-2xl rounded-tr-sm text-sm"
                style={{ 
                  backgroundColor: c.userBubbleColor, 
                  opacity: c.userBubbleOpacity, 
                  color: c.userTextColor 
                }}
              >
                Hi there! I have a question.
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          
          {/* Proactive AI Message */}
          <div className="flex gap-2 items-start max-w-[85%] relative z-10">
            <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <span className="text-[10px] font-medium mb-1 flex items-center gap-1" style={{ color: c.aiNameColor }}>
                Assistant
                <Sparkles className="h-2.5 w-2.5" style={{ color: c.proactiveHighlightColor }} />
              </span>
              <div
                className="px-3 py-2 rounded-2xl rounded-tl-sm text-sm border-l-2"
                style={{ 
                  backgroundColor: c.aiBubbleColor, 
                  opacity: c.aiBubbleOpacity, 
                  color: c.aiTextColor,
                  borderLeftColor: c.proactiveHighlightColor
                }}
              >
                I noticed something you might like!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Bubbles - Side by Side */}
      <div className="rounded-xl border border-border/20 bg-background/60 p-4">
        <h4 className="font-medium text-sm mb-4 flex items-center gap-2 text-foreground">
          <MessageSquare className="h-4 w-4 text-primary" />
          Message Bubbles
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Bubble Settings */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/20 border border-border/10">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-4 w-4" />
              Your Messages
            </div>
            <ColorInput
              label="Bubble Color"
              name="userBubbleColor"
              value={c.userBubbleColor}
              onColorChange={onColorChange}
            />
            <OpacitySlider
              label="Opacity"
              name="userBubbleOpacity"
              value={c.userBubbleOpacity}
              onChange={handleSliderChange}
            />
            <ColorInput
              label="Text Color"
              name="userTextColor"
              value={c.userTextColor}
              onColorChange={onColorChange}
            />
          </div>
          
          {/* AI Bubble Settings */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/20 border border-border/10">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Bot className="h-4 w-4" />
              AI Messages
            </div>
            <ColorInput
              label="Bubble Color"
              name="aiBubbleColor"
              value={c.aiBubbleColor}
              onColorChange={onColorChange}
            />
            <OpacitySlider
              label="Opacity"
              name="aiBubbleOpacity"
              value={c.aiBubbleOpacity}
              onChange={handleSliderChange}
            />
            <ColorInput
              label="Text Color"
              name="aiTextColor"
              value={c.aiTextColor}
              onColorChange={onColorChange}
            />
          </div>
        </div>
      </div>

      {/* Name Tags & Highlights */}
      <div className="rounded-xl border border-border/20 bg-background/60 p-4">
        <h4 className="font-medium text-sm mb-4 flex items-center gap-2 text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Name Tags & Highlights
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorInput
            label="Your Name"
            name="userNameColor"
            value={c.userNameColor}
            onColorChange={onColorChange}
          />
          <ColorInput
            label="AI Name"
            name="aiNameColor"
            value={c.aiNameColor}
            onColorChange={onColorChange}
          />
          <ColorInput
            label="Proactive Highlight"
            name="proactiveHighlightColor"
            value={c.proactiveHighlightColor}
            onColorChange={onColorChange}
          />
        </div>
      </div>
    </div>
  );
}
