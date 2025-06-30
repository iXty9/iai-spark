
import React from 'react';
import { ThemeColors } from '@/types/theme';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sun, Moon } from 'lucide-react';
import { getMarkupElements } from './markup/MarkupElementConfig';
import { MarkupControlCard } from './markup/MarkupControlCard';
import { MarkupPreview } from './markup/MarkupPreview';

interface MarkupSettingsProps {
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  currentMode: 'light' | 'dark';
  onLightThemeChange: (colorKey: string, value: string | number) => void;
  onDarkThemeChange: (colorKey: string, value: string | number) => void;
  onModeChange: (mode: 'light' | 'dark') => void;
  onReset: () => void;
}

export const MarkupSettings: React.FC<MarkupSettingsProps> = ({
  lightTheme,
  darkTheme,
  currentMode,
  onLightThemeChange,
  onDarkThemeChange,
  onModeChange,
  onReset
}) => {
  const handleChange = (colorKey: string, value: string, mode: 'light' | 'dark') => {
    if (mode === 'light') {
      onLightThemeChange(colorKey, value);
    } else {
      onDarkThemeChange(colorKey, value);
    }
  };

  const renderMarkupControls = (colors: ThemeColors, mode: 'light' | 'dark') => {
    const markupElements = getMarkupElements(colors);
    
    return (
      <div className="grid gap-4">
        {markupElements.map((element) => (
          <MarkupControlCard
            key={element.key}
            element={element}
            mode={mode}
            onBackgroundChange={(key, value) => handleChange(key, value, mode)}
            onTextChange={(key, value) => handleChange(key, value, mode)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Markup Styling</h3>
          <p className="text-sm text-muted-foreground">
            Customize colors for markdown elements in AI messages
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="flex items-center space-x-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset</span>
        </Button>
      </div>

      <Tabs value={currentMode} onValueChange={(value) => onModeChange(value as 'light' | 'dark')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="light" className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Light Mode
          </TabsTrigger>
          <TabsTrigger value="dark" className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Dark Mode
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="light" className="space-y-6">
          {renderMarkupControls(lightTheme, 'light')}
          <MarkupPreview colors={lightTheme} />
        </TabsContent>
        
        <TabsContent value="dark" className="space-y-6">
          {renderMarkupControls(darkTheme, 'dark')}
          <MarkupPreview colors={darkTheme} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
