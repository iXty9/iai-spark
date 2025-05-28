
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
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logging';
import { productionThemeService } from '@/services/production-theme-service';

const Settings = () => {
  const navigate = useNavigate();
  const { theme, lightTheme, darkTheme, backgroundImage, backgroundOpacity, isThemeLoaded } = useTheme();
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageInfo, setImageInfo] = useState({});
  const [localLightTheme, setLocalLightTheme] = useState(lightTheme);
  const [localDarkTheme, setLocalDarkTheme] = useState(darkTheme);
  const [localBackgroundImage, setLocalBackgroundImage] = useState(backgroundImage);
  const [localBackgroundOpacity, setLocalBackgroundOpacity] = useState(backgroundOpacity);

  // Sync with theme service
  useEffect(() => {
    setLocalLightTheme(lightTheme);
    setLocalDarkTheme(darkTheme);
    setLocalBackgroundImage(backgroundImage);
    setLocalBackgroundOpacity(backgroundOpacity);
  }, [lightTheme, darkTheme, backgroundImage, backgroundOpacity]);

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

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setLocalBackgroundImage(imageUrl);
      productionThemeService.setBackgroundImage(imageUrl);
      setHasChanges(true);
      
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
      
      toast({
        title: "Background uploaded",
        description: "Your background image has been applied.",
      });

      logger.info('Background image uploaded', { module: 'settings' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = () => {
    setLocalBackgroundImage(null);
    productionThemeService.setBackgroundImage(null);
    setHasChanges(true);
    setImageInfo({});
    
    toast({
      title: "Background removed",
      description: "Your background image has been removed.",
    });

    logger.info('Background image removed', { module: 'settings' });
  };

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0];
    setLocalBackgroundOpacity(newOpacity);
    productionThemeService.setBackgroundOpacity(newOpacity);
    setHasChanges(true);
    logger.info('Background opacity changed', { module: 'settings', opacity: newOpacity });
  };

  const handleLightThemeChange = (colorKey: string, value: string | number) => {
    const updatedTheme: ThemeColors = {
      ...localLightTheme,
      [colorKey]: value
    };
    setLocalLightTheme(updatedTheme);
    productionThemeService.setLightTheme(updatedTheme);
    setHasChanges(true);
  };

  const handleDarkThemeChange = (colorKey: string, value: string | number) => {
    const updatedTheme: ThemeColors = {
      ...localDarkTheme,
      [colorKey]: value
    };
    setLocalDarkTheme(updatedTheme);
    productionThemeService.setDarkTheme(updatedTheme);
    setHasChanges(true);
  };

  const handleResetTheme = () => {
    window.location.reload();
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "Your theme settings have been saved.",
      });
      logger.info('Settings saved successfully', { module: 'settings' });
    } catch (error) {
      logger.error('Error saving settings', error, { module: 'settings' });
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSettings = () => {
    // Reset to defaults
    const defaultLight = productionThemeService.getState().lightTheme;
    const defaultDark = productionThemeService.getState().darkTheme;
    
    setLocalLightTheme(defaultLight);
    setLocalDarkTheme(defaultDark);
    setLocalBackgroundImage(null);
    setLocalBackgroundOpacity(0.5);
    
    productionThemeService.setLightTheme(defaultLight);
    productionThemeService.setDarkTheme(defaultDark);
    productionThemeService.setBackgroundImage(null);
    productionThemeService.setBackgroundOpacity(0.5);
    
    setHasChanges(true);
    setImageInfo({});
    
    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults.",
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
        <div className="mb-6 flex items-center">
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
        
        <div className="grid gap-6">
          <Card className="bg-card/60 backdrop-blur-md border shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsTabs>
                <TabsContent value="appearance" className="space-y-6 mt-4">
                  <AppearanceSettings
                    theme={theme as 'light' | 'dark'}
                    lightTheme={localLightTheme as ThemeColors}
                    darkTheme={localDarkTheme as ThemeColors}
                    onLightThemeChange={handleLightThemeChange}
                    onDarkThemeChange={handleDarkThemeChange}
                    onResetTheme={handleResetTheme}
                  />
                </TabsContent>
                
                <TabsContent value="background" className="space-y-6 mt-4">
                  <BackgroundSettings
                    backgroundImage={localBackgroundImage}
                    backgroundOpacity={localBackgroundOpacity}
                    onBackgroundImageUpload={handleBackgroundImageUpload}
                    onOpacityChange={handleOpacityChange}
                    onRemoveBackground={handleRemoveBackground}
                    isLoading={false}
                    imageInfo={imageInfo}
                  />
                </TabsContent>
              </SettingsTabs>
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-4 mt-4">
            {hasChanges && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleResetSettings}
                  disabled={isSubmitting}
                >
                  Reset Changes
                </Button>
                <Button 
                  onClick={handleSaveSettings}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
            {!hasChanges && (
              <Button 
                variant="outline" 
                onClick={() => toast({
                  title: "Current Settings Active",
                  description: "These settings are already being used.",
                })}
              >
                Current Settings
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
