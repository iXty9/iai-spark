
import React, { useState, useEffect } from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { useTheme } from '@/hooks/use-theme';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ThemeColors } from '@/types/theme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logging';
import { productionThemeService } from '@/services/production-theme-service';

const Settings = () => {
  const navigate = useNavigate();
  const { theme, lightTheme, darkTheme, backgroundImage, backgroundOpacity, isThemeLoaded } = useTheme();
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const [imageInfo, setImageInfo] = useState({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Show auto-save feedback
  const showAutoSaveStatus = (status: 'saving' | 'saved') => {
    setAutoSaveStatus(status);
    if (status === 'saved') {
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }
  };

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please choose an image smaller than 5MB.",
      });
      return;
    }

    showAutoSaveStatus('saving');
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      productionThemeService.setBackgroundImage(imageUrl);
      
      // Set image info
      const img = new Image();
      img.onload = () => {
        setImageInfo({
          width: img.width,
          height: img.height,
          originalSize: `${(file.size / 1024).toFixed(1)} KB`
        });
      };
      img.src = imageUrl;
      
      showAutoSaveStatus('saved');
      toast({
        title: "Background uploaded",
        description: "Your background image has been applied automatically.",
      });

      logger.info('Background image uploaded', { module: 'settings' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = () => {
    showAutoSaveStatus('saving');
    productionThemeService.setBackgroundImage(null);
    setImageInfo({});
    showAutoSaveStatus('saved');
    
    toast({
      title: "Background removed",
      description: "Your background image has been removed automatically.",
    });

    logger.info('Background image removed', { module: 'settings' });
  };

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0];
    showAutoSaveStatus('saving');
    productionThemeService.setBackgroundOpacity(newOpacity);
    showAutoSaveStatus('saved');
    logger.info('Background opacity changed', { module: 'settings', opacity: newOpacity });
  };

  const handleLightThemeChange = (colorKey: string, value: string | number) => {
    const updatedTheme: ThemeColors = {
      ...lightTheme,
      [colorKey]: value
    };
    showAutoSaveStatus('saving');
    productionThemeService.setLightTheme(updatedTheme);
    showAutoSaveStatus('saved');
    logger.info('Light theme changed', { colorKey, value, module: 'settings' });
  };

  const handleDarkThemeChange = (colorKey: string, value: string | number) => {
    const updatedTheme: ThemeColors = {
      ...darkTheme,
      [colorKey]: value
    };
    showAutoSaveStatus('saving');
    productionThemeService.setDarkTheme(updatedTheme);
    showAutoSaveStatus('saved');
    logger.info('Dark theme changed', { colorKey, value, module: 'settings' });
  };

  const handleResetTheme = () => {
    showAutoSaveStatus('saving');
    
    // Reset to service defaults
    const serviceState = productionThemeService.getState();
    const defaultLight = {
      backgroundColor: '#ffffff',
      primaryColor: '#dd3333',
      textColor: '#000000',
      accentColor: '#9b87f5',
      userBubbleColor: '#dd3333',
      aiBubbleColor: '#9b87f5',
      userBubbleOpacity: 0.3,
      aiBubbleOpacity: 0.3,
      userTextColor: '#000000',
      aiTextColor: '#000000'
    };
    
    const defaultDark = {
      backgroundColor: '#121212',
      primaryColor: '#dd3333',
      textColor: '#ffffff',
      accentColor: '#9b87f5',
      userBubbleColor: '#dd3333',
      aiBubbleColor: '#9b87f5',
      userBubbleOpacity: 0.3,
      aiBubbleOpacity: 0.3,
      userTextColor: '#ffffff',
      aiTextColor: '#ffffff'
    };
    
    productionThemeService.setLightTheme(defaultLight);
    productionThemeService.setDarkTheme(defaultDark);
    productionThemeService.setBackgroundImage(null);
    productionThemeService.setBackgroundOpacity(0.5);
    
    setImageInfo({});
    showAutoSaveStatus('saved');
    
    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults and saved automatically.",
    });
    logger.info('Settings reset to defaults', { module: 'settings' });
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (!isThemeLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 max-w-6xl mx-auto">
        <Card className="w-full max-w-4xl p-4 bg-card/60 backdrop-blur-md border shadow-lg">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <h2 className="text-xl font-medium">Loading settings...</h2>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4">
      <div className="container max-w-6xl mx-auto flex-1">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleGoBack}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Settings</h1>
              <p className="text-muted-foreground">Customize your app experience</p>
            </div>
          </div>
          
          {/* Auto-save status indicator */}
          <div className="flex items-center space-x-2">
            {autoSaveStatus === 'saving' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Saving...</span>
              </>
            )}
            {autoSaveStatus === 'saved' && (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Auto-saved</span>
              </>
            )}
            {autoSaveStatus === 'idle' && (
              <span className="text-sm text-muted-foreground">Changes save automatically</span>
            )}
          </div>
        </div>
        
        <div className="grid gap-6">
          <Card className="bg-card/60 backdrop-blur-md border shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of your application. All changes are saved automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsTabs>
                <TabsContent value="appearance" className="space-y-6 mt-4">
                  <AppearanceSettings
                    theme={theme as 'light' | 'dark'}
                    lightTheme={lightTheme as ThemeColors}
                    darkTheme={darkTheme as ThemeColors}
                    onLightThemeChange={handleLightThemeChange}
                    onDarkThemeChange={handleDarkThemeChange}
                    onResetTheme={handleResetTheme}
                  />
                </TabsContent>
                
                <TabsContent value="background" className="space-y-6 mt-4">
                  <BackgroundSettings
                    backgroundImage={backgroundImage}
                    backgroundOpacity={backgroundOpacity}
                    onBackgroundImageUpload={handleBackgroundImageUpload}
                    onOpacityChange={handleOpacityChange}
                    onRemoveBackground={handleRemoveBackground}
                    isLoading={autoSaveStatus === 'saving'}
                    imageInfo={imageInfo}
                  />
                </TabsContent>
              </SettingsTabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
