
import { useAuth } from '@/contexts/AuthContext';
import { useSupaThemes } from '@/hooks/use-supa-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette, Image, AlertCircle, Code, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { MarkupSettings } from '@/components/settings/MarkupSettings';
import { SoundSettings } from '@/components/settings/SoundSettings';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';
import { useEffect } from 'react';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    isLoading,
    isSubmitting,
    hasChanges,
    isInPreview,
    imageInfo,
    mode,
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity,
    enterSettingsMode,
    exitSettingsMode,
    updatePreviewMode,
    updatePreviewLightTheme,
    updatePreviewDarkTheme,
    updatePreviewBackgroundImage,
    updatePreviewBackgroundOpacity,
    saveChanges,
    discardChanges,
    resetToDefaults,
    setImageInfo
  } = useSupaThemes();

  // Enter preview mode when component mounts
  useEffect(() => {
    enterSettingsMode();
    
    return () => {
      if (isInPreview) {
        exitSettingsMode(false);
      }
    };
  }, []);

  // Theme change handlers
  const handleLightThemeChange = (colorKey: string, value: string | number) => {
    const updatedTheme = { ...lightTheme, [colorKey]: value };
    updatePreviewLightTheme(updatedTheme);
  };

  const handleDarkThemeChange = (colorKey: string, value: string | number) => {
    const updatedTheme = { ...darkTheme, [colorKey]: value };
    updatePreviewDarkTheme(updatedTheme);
  };

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Import image optimization utility
      const { optimizeImage, formatFileSize, estimateDataUrlSize } = await import('@/utils/image-optimizer');
      
      // Check file size - max 10MB for original
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Background image must be less than 10MB",
        });
        return;
      }
      
      // Get image dimensions and optimize
      const img = new window.Image();
      const originalUrl = URL.createObjectURL(file);
      
      img.onload = async () => {
        try {
          const originalSize = formatFileSize(file.size);
          const width = img.width;
          const height = img.height;
          
          // Generate optimized version as data URL
          const optimizedImageUrl = await optimizeImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.75,
            format: 'image/jpeg'
          });
          
          const optimizedSize = formatFileSize(estimateDataUrlSize(optimizedImageUrl));
          
          const info = {
            originalSize,
            optimizedSize,
            width,
            height
          };
          
          updatePreviewBackgroundImage(optimizedImageUrl, info);
          URL.revokeObjectURL(originalUrl);
        } catch (error) {
          logger.error('Error optimizing image:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to process image. Please try another file.",
          });
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(originalUrl);
        toast({
          variant: "destructive",
          title: "Invalid image",
          description: "The selected file is not a valid image.",
        });
      };
      
      img.src = originalUrl;
    } catch (error) {
      logger.error('Error in background image upload:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload image. Please try again.",
      });
    }
  };

  const handleRemoveBackground = () => {
    updatePreviewBackgroundImage(null);
    setImageInfo({});
  };

  const handleOpacityChange = (value: number[]) => {
    const opacity = value[0];
    updatePreviewBackgroundOpacity(opacity);
  };

  // Settings actions
  const handleSaveSettings = async () => {
    try {
      const success = await saveChanges();
      
      if (success) {
        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved successfully",
        });
      }
    } catch (error) {
      logger.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      });
    }
  };

  const handleCancelSettings = () => {
    discardChanges();
    toast({
      title: "Changes discarded",
      description: "Your unsaved changes have been reverted",
    });
  };

  const handleResetSettings = async () => {
    try {
      const success = await resetToDefaults();
      
      if (success) {
        toast({
          title: "Settings reset",
          description: "Your theme settings have been reset to defaults",
        });
      }
    } catch (error) {
      logger.error('Error resetting settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset settings. Please try again.",
      });
    }
  };

  const handleGoBack = () => {
    if (hasChanges) {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      );
      if (!confirmLeave) return;
    }
    
    exitSettingsMode(false);
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded-lg"></div>
          <div className="h-96 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-2"
              onClick={handleGoBack}
              aria-label="Go back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-center flex-1">Settings</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {hasChanges && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                You have unsaved changes. Make sure to save your settings before leaving this page.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="appearance" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Appearance</span>
                <span className="sm:hidden">Style</span>
              </TabsTrigger>
              <TabsTrigger value="background" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Background</span>
                <span className="sm:hidden">BG</span>
              </TabsTrigger>
              <TabsTrigger value="sounds" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span>Sounds</span>
              </TabsTrigger>
              <TabsTrigger value="markup" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <span>Markup</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="appearance" className="space-y-6">
              <AppearanceSettings
                theme={mode}
                lightTheme={lightTheme}
                darkTheme={darkTheme}
                onLightThemeChange={handleLightThemeChange}
                onDarkThemeChange={handleDarkThemeChange}
                onResetTheme={handleResetSettings}
                onThemeModeChange={updatePreviewMode}
              />
            </TabsContent>
            
            <TabsContent value="background" className="space-y-6">
              <BackgroundSettings
                backgroundImage={backgroundImage}
                backgroundOpacity={backgroundOpacity}
                imageInfo={imageInfo}
                onBackgroundImageUpload={handleBackgroundImageUpload}
                onRemoveBackground={handleRemoveBackground}
                onOpacityChange={handleOpacityChange}
                isLoading={false}
              />
            </TabsContent>
            
            <TabsContent value="sounds" className="space-y-6">
              <SoundSettings />
            </TabsContent>
            
            <TabsContent value="markup" className="space-y-6">
              <MarkupSettings
                lightTheme={lightTheme}
                darkTheme={darkTheme}
                currentMode={mode}
                onLightThemeChange={handleLightThemeChange}
                onDarkThemeChange={handleDarkThemeChange}
                onModeChange={updatePreviewMode}
                onReset={handleResetSettings}
              />
            </TabsContent>
          </Tabs>
          
          <SettingsFooter 
            onReset={handleResetSettings}
            onCancel={handleCancelSettings}
            onSave={handleSaveSettings}
            isSubmitting={isSubmitting}
            hasChanges={hasChanges}
          />
        </CardContent>
      </Card>
    </div>
  );
}
