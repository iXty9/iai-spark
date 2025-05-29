
import React from 'react';
import { ThemeControls } from '@/components/settings/ThemeControls';
import { ThemeColors } from '@/types/theme';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export interface AppearanceSettingsProps {
  theme: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  onLightThemeChange: (colorKey: string, value: string | number) => void;
  onDarkThemeChange: (colorKey: string, value: string | number) => void;
  onResetTheme: () => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  theme,
  lightTheme,
  darkTheme,
  onLightThemeChange,
  onDarkThemeChange,
  onResetTheme
}) => {
  // Create wrapper functions to adapt the event-based interface to the colorKey/value interface
  const handleLightThemeChange = (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => {
    if ('target' in e) {
      onLightThemeChange(e.target.name, e.target.value);
    } else {
      onLightThemeChange(e.name, e.value);
    }
  };
  
  const handleDarkThemeChange = (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => {
    if ('target' in e) {
      onDarkThemeChange(e.target.name, e.target.value);
    } else {
      onDarkThemeChange(e.name, e.value);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Theme Colors</h3>
          <p className="text-sm text-muted-foreground">Customize colors for light and dark modes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetTheme}
          className="flex items-center space-x-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset</span>
        </Button>
      </div>

      <Tabs defaultValue={theme === 'light' ? 'light' : 'dark'}>
        <TabsList className="mb-4 grid grid-cols-2">
          <TabsTrigger value="light">Light Mode</TabsTrigger>
          <TabsTrigger value="dark">Dark Mode</TabsTrigger>
        </TabsList>
        
        <TabsContent value="light" className="space-y-4">
          <ThemeControls 
            colors={lightTheme}
            onColorChange={handleLightThemeChange}
            isActive={theme === 'light'}
          />
        </TabsContent>
        
        <TabsContent value="dark" className="space-y-4">
          <ThemeControls 
            colors={darkTheme}
            onColorChange={handleDarkThemeChange}
            isActive={theme === 'dark'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
