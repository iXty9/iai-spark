
import React from 'react';
import { ThemeControls } from '@/components/settings/ThemeControls';
import { ThemeColors } from '@/types/theme';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, Sun, Moon, Palette, Sparkles } from 'lucide-react';

export interface AppearanceSettingsProps {
  theme: 'light' | 'dark';
  lightTheme: ThemeColors;
  darkTheme: ThemeColors;
  onLightThemeChange: (colorKey: string, value: string | number) => void;
  onDarkThemeChange: (colorKey: string, value: string | number) => void;
  onResetTheme: () => void;
  onThemeModeChange?: (mode: 'light' | 'dark') => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  theme,
  lightTheme,
  darkTheme,
  onLightThemeChange,
  onDarkThemeChange,
  onResetTheme,
  onThemeModeChange
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

  // Handle tab change for theme mode switching - FIXED: Use prop callback instead of direct service calls
  const handleThemeModeChange = (newMode: string) => {
    if (onThemeModeChange) {
      onThemeModeChange(newMode as 'light' | 'dark');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Modern Header with Mobile-First Design */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Palette className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Theme Colors</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Customize your theme colors in real-time. Changes are previewed instantly and can be saved or discarded.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onResetTheme}
              className="flex items-center gap-2 shrink-0 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden xs:inline">Reset to Defaults</span>
              <span className="xs:hidden">Reset</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Theme Mode Tabs */}
      <Card className="glass-panel border-0 shadow-sm overflow-hidden">
        <Tabs value={theme} onValueChange={handleThemeModeChange} className="w-full">
          <div className="border-b border-border/50 bg-muted/30">
            <TabsList className="grid grid-cols-2 w-full h-auto p-1 bg-transparent">
              <TabsTrigger 
                value="light" 
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all duration-200 hover:bg-background/50"
              >
                <Sun className="h-4 w-4" />
                <span className="hidden xs:inline">Light Mode</span>
                <span className="xs:hidden">Light</span>
              </TabsTrigger>
              <TabsTrigger 
                value="dark" 
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all duration-200 hover:bg-background/50"
              >
                <Moon className="h-4 w-4" />
                <span className="hidden xs:inline">Dark Mode</span>
                <span className="xs:hidden">Dark</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <CardContent className="p-4 sm:p-6">
            <TabsContent value="light" className="mt-0 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-foreground">Light Theme Colors</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>
              <ThemeControls 
                colors={lightTheme}
                onColorChange={handleLightThemeChange}
                isActive={theme === 'light'}
              />
            </TabsContent>
            
            <TabsContent value="dark" className="mt-0 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-foreground">Dark Theme Colors</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>
              <ThemeControls 
                colors={darkTheme}
                onColorChange={handleDarkThemeChange}
                isActive={theme === 'dark'}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};
