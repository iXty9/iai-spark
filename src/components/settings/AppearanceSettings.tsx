
import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Palette, Sun, Moon } from 'lucide-react';
import { ThemeColors } from '@/types/theme';
import { ThemeControls } from './ThemeControls';

interface AppearanceSettingsProps {
  theme: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  onThemeChange: (value: 'light' | 'dark') => void;
  onLightThemeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDarkThemeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AppearanceSettings({
  theme,
  lightTheme,
  darkTheme,
  onThemeChange,
  onLightThemeChange,
  onDarkThemeChange,
}: AppearanceSettingsProps) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}
