
import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Palette, Sun, Moon, Image } from 'lucide-react';
import { ThemeColors } from '@/types/theme';
import { ThemeControls } from './ThemeControls';
import { BackgroundSettings } from './BackgroundSettings';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

      <Accordion type="single" collapsible defaultValue="background" className="w-full">
        <AccordionItem value="background">
          <AccordionTrigger className="flex items-center">
            <div className="flex items-center">
              <Image className="h-5 w-5 mr-2" />
              <span>Background Image</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-4">
              <BackgroundSettings
                backgroundImage={backgroundImage}
                backgroundOpacity={backgroundOpacity}
                onBackgroundImageUpload={onBackgroundImageUpload}
                onOpacityChange={onBackgroundOpacityChange}
                onRemoveBackground={onRemoveBackground}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="colors">
          <AccordionTrigger className="flex items-center">
            <div className="flex items-center">
              <Palette className="h-5 w-5 mr-2" />
              <span>Theme Colors</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-4">
              <h3 className="text-lg font-medium mb-3">
                {theme === 'dark' ? 'Dark Theme Colors' : 'Light Theme Colors'}
              </h3>
              <ThemeControls
                theme={theme}
                colors={theme === 'light' ? lightTheme : darkTheme}
                onColorChange={theme === 'light' ? onLightThemeChange : onDarkThemeChange}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
