
import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Palette, Sun, Moon, Image } from 'lucide-react';
import { ThemeColors } from '@/types/theme';
import { ThemeControls } from './ThemeControls';
import { BackgroundSettings } from './BackgroundSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AppearanceSettingsProps {
  theme: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  backgroundImage: string | null;
  backgroundOpacity: number;
  onThemeChange: (value: 'light' | 'dark') => void;
  onLightThemeChange: (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => void;
  onDarkThemeChange: (e: React.ChangeEvent<HTMLInputElement> | { name: string; value: any }) => void;
  onBackgroundImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBackgroundOpacityChange: (value: number[]) => void;
  onRemoveBackground: () => void;
}

export function AppearanceSettings({
  theme,
  lightTheme,
  darkTheme,
  backgroundImage,
  backgroundOpacity,
  onThemeChange,
  onLightThemeChange,
  onDarkThemeChange,
  onBackgroundImageUpload,
  onBackgroundOpacityChange,
  onRemoveBackground
}: AppearanceSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Palette className="h-5 w-5" />
          <Label>Theme Mode</Label>
        </div>
        <RadioGroup 
          defaultValue={theme} 
          className="flex items-center space-x-4"
          onValueChange={value => onThemeChange(value as 'light' | 'dark')}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="light" id="theme-light" />
            <Label htmlFor="theme-light" className="flex items-center">
              <Sun className="h-4 w-4 mr-1" />
              Light
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dark" id="theme-dark" />
            <Label htmlFor="theme-dark" className="flex items-center">
              <Moon className="h-4 w-4 mr-1" />
              Dark
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Tabs defaultValue="colors">
        <TabsList className="w-full">
          <TabsTrigger value="colors" className="flex-1">Colors</TabsTrigger>
          <TabsTrigger value="background" className="flex-1">Background</TabsTrigger>
        </TabsList>
        
        <TabsContent value="colors" className="space-y-4 mt-4">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3">
              {theme === 'dark' ? 'Dark Theme Colors' : 'Light Theme Colors'}
            </h3>
            <ThemeControls
              theme={theme}
              colors={theme === 'light' ? lightTheme : darkTheme}
              onColorChange={theme === 'light' ? onLightThemeChange : onDarkThemeChange}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="background" className="space-y-4 mt-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Image className="h-5 w-5" />
              <h3 className="text-lg font-medium">Background Image</h3>
            </div>
            <BackgroundSettings
              backgroundImage={backgroundImage}
              backgroundOpacity={backgroundOpacity}
              onBackgroundImageUpload={onBackgroundImageUpload}
              onOpacityChange={onBackgroundOpacityChange}
              onRemoveBackground={onRemoveBackground}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
