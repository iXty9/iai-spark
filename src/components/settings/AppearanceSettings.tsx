
import React from 'react';
import { ThemeControls } from '@/components/settings/ThemeControls';
import { ThemeColors } from '@/types/theme';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sun, Moon } from 'lucide-react';

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
    <div className="space-y-8">
      {/* Enhanced Section Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border/30">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Theme Colors
          </h3>
          <p className="text-muted-foreground text-base">
            Customize colors for light and dark modes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetTheme}
          className="flex items-center space-x-2 hover:bg-muted/50 transition-all duration-200 border-muted-foreground/20"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset All</span>
        </Button>
      </div>

      {/* Enhanced Theme Mode Tabs */}
      <div className="bg-gradient-to-br from-muted/20 via-muted/10 to-muted/20 rounded-xl p-6 border border-border/20">
        <Tabs defaultValue={theme === 'light' ? 'light' : 'dark'}>
          <TabsList className="mb-6 grid grid-cols-2 bg-background/60 backdrop-blur-sm border border-border/20 p-1 h-12 w-full max-w-md mx-auto">
            <TabsTrigger 
              value="light" 
              className="flex items-center gap-2 text-sm font-medium h-10 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Sun className="h-4 w-4" />
              Light Mode
            </TabsTrigger>
            <TabsTrigger 
              value="dark"
              className="flex items-center gap-2 text-sm font-medium h-10 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Moon className="h-4 w-4" />
              Dark Mode
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="light" className="space-y-6 mt-0">
            <div className="bg-gradient-to-br from-background/60 to-background/40 rounded-lg p-6 border border-border/20">
              <ThemeControls 
                colors={lightTheme}
                onColorChange={handleLightThemeChange}
                isActive={theme === 'light'}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="dark" className="space-y-6 mt-0">
            <div className="bg-gradient-to-br from-background/60 to-background/40 rounded-lg p-6 border border-border/20">
              <ThemeControls 
                colors={darkTheme}
                onColorChange={handleDarkThemeChange}
                isActive={theme === 'dark'}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
