
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ThemeControls } from '@/components/settings/ThemeControls';
import { ThemeColors } from '@/types/theme';

export interface AppearanceSettingsProps {
  theme: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  onLightThemeChange: (colorKey: string, value: string) => void;
  onDarkThemeChange: (colorKey: string, value: string) => void;
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
  const handleLightThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onLightThemeChange(e.target.name, e.target.value);
  };
  
  const handleDarkThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDarkThemeChange(e.target.name, e.target.value);
  };
  
  return (
    <div className="space-y-6">
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Theme Colors</h3>
            <p className="text-sm text-muted-foreground">
              Customize the appearance of your chat interface
            </p>
          </div>
          
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label className="text-base font-medium">Light Mode</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ThemeControls 
                  colors={lightTheme}
                  onColorChange={handleLightThemeChange}
                  isActive={theme === 'light'}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label className="text-base font-medium">Dark Mode</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ThemeControls 
                  colors={darkTheme}
                  onColorChange={handleDarkThemeChange}
                  isActive={theme === 'dark'}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={onResetTheme}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
