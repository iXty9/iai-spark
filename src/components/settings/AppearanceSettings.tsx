
import React from 'react';
import { Label } from '@/components/ui/label';
import { ThemeControls } from '@/components/settings/ThemeControls';
import { ThemeColors } from '@/types/theme';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

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
      <Card className="bg-card/90 backdrop-blur-sm border shadow-md">
        <CardContent className="pt-6">
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
          
          <div className="flex justify-end mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetTheme}
            >
              Reset to defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
