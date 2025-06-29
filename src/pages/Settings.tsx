
import { useAuth } from '@/contexts/AuthContext';
import { useCentralizedSettingsState } from '@/hooks/settings/use-centralized-settings-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette, Image, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';
import { useEffect } from 'react';

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
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
    resetToDefaults
  } = useCentralizedSettingsState();

  // Enter preview mode when component mounts
  useEffect(() => {
    enterSettingsMode();
    
    // Cleanup: exit preview mode when component unmounts (without saving)
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

  const handleBackgroundImageUpload = async (file: File): Promise<void> => {
    // TODO: Implement actual upload logic
    const fakeUrl = URL.createObjectURL(file);
    updatePreviewBackgroundImage(fakeUrl, {
      originalSize: `${file.size} bytes`,
      optimizedSize: `${file.size} bytes`
    });
  };

  const handleRemoveBackground = () => {
    updatePreviewBackgroundImage(null);
  };

  const handleOpacityChange = (opacity: number) => {
    updatePreviewBackgroundOpacity(opacity);
  };

  // Settings actions
  const handleSaveSettings = async () => {
    try {
      const success = await saveChanges();
      
      if (success && user && updateProfile) {
        // Save to profile
        const themeSettings = {
          mode,
          lightTheme,
          darkTheme,
          backgroundImage,
          backgroundOpacity,
          exportDate: new Date().toISOString(),
          name: 'Custom Theme'
        };
        
        await updateProfile({ theme_settings: JSON.stringify(themeSettings) });
        
        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved successfully",
        });
      } else if (success) {
        toast({
          title: "Settings saved",
          description: "Your theme settings have been saved locally",
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
    
    // Exit preview mode without saving
    exitSettingsMode(false);
    navigate('/');
  };

  // Show loading state
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
          {/* Unsaved Changes Alert */}
          {hasChanges && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                You have unsaved changes. Make sure to save your settings before leaving this page.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Main Settings Tabs */}
          <Tabs defaultValue="appearance" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span>Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="background" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span>Background</span>
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
          </Tabs>
          
          {/* Footer */}
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
