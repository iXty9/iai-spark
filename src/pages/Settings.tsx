
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

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme, lightTheme, darkTheme } = useTheme();
  const { toast } = useToast();
  const { user, profile, updateProfile } = useAuth();
  
  // Simplified local state for backgrounds
  const [localBackgroundImage, setLocalBackgroundImage] = useState<string | null>(null);
  const [localBackgroundOpacity, setLocalBackgroundOpacity] = useState(0.5);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageInfo, setImageInfo] = useState({});

  // Load initial background from profile or localStorage
  useEffect(() => {
    const loadBackground = () => {
      try {
        // Try profile first
        if (profile?.theme_settings) {
          const settings = JSON.parse(profile.theme_settings);
          if (settings.backgroundImage) {
            setLocalBackgroundImage(settings.backgroundImage);
            setLocalBackgroundOpacity(settings.backgroundOpacity || 0.5);
            // Apply to DOM immediately
            applyBackgroundToDOM(settings.backgroundImage, settings.backgroundOpacity || 0.5);
          }
        } else {
          // Try localStorage as fallback
          const savedBg = localStorage.getItem('background-image');
          const savedOpacity = localStorage.getItem('background-opacity');
          if (savedBg) {
            setLocalBackgroundImage(savedBg);
            const opacity = savedOpacity ? parseFloat(savedOpacity) : 0.5;
            setLocalBackgroundOpacity(opacity);
            applyBackgroundToDOM(savedBg, opacity);
          }
        }
      } catch (error) {
        console.error('Error loading background:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBackground();
  }, [profile]);

  // Apply background directly to DOM
  const applyBackgroundToDOM = (image: string | null, opacity: number) => {
    const body = document.body;
    if (image) {
      body.style.backgroundImage = `url(${image})`;
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center';
      body.style.backgroundRepeat = 'no-repeat';
      body.style.backgroundAttachment = 'fixed';
      body.style.opacity = opacity.toString();
    } else {
      body.style.backgroundImage = '';
      body.style.opacity = '1';
    }
  };

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
      setHasChanges(true);
      
      // Apply immediately to DOM
      applyBackgroundToDOM(imageUrl, localBackgroundOpacity);
      
      // Save to localStorage for persistence
      localStorage.setItem('background-image', imageUrl);
      
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
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = () => {
    setLocalBackgroundImage(null);
    setHasChanges(true);
    applyBackgroundToDOM(null, localBackgroundOpacity);
    localStorage.removeItem('background-image');
    setImageInfo({});
    
    toast({
      title: "Background removed",
      description: "Your background image has been removed.",
    });
  };

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0];
    setLocalBackgroundOpacity(newOpacity);
    setHasChanges(true);
    
    // Apply immediately to DOM
    if (localBackgroundImage) {
      applyBackgroundToDOM(localBackgroundImage, newOpacity);
    }
    
    // Save to localStorage
    localStorage.setItem('background-opacity', newOpacity.toString());
  };

  const handleSaveSettings = async () => {
    if (!updateProfile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to save settings. Please try again.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create theme settings object
      const themeSettings = {
        mode: theme,
        lightTheme,
        darkTheme,
        backgroundImage: localBackgroundImage,
        backgroundOpacity: localBackgroundOpacity,
        exportDate: new Date().toISOString(),
        name: 'Custom Theme'
      };

      await updateProfile({ 
        theme_settings: JSON.stringify(themeSettings) 
      });

      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "Your theme settings have been saved to your profile.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
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
    setLocalBackgroundImage(null);
    setLocalBackgroundOpacity(0.5);
    setHasChanges(false);
    applyBackgroundToDOM(null, 0.5);
    localStorage.removeItem('background-image');
    localStorage.removeItem('background-opacity');
    setImageInfo({});
    
    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults.",
    });
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 max-w-6xl mx-auto">
        <Card className="w-full max-w-4xl p-4 bg-card/90 backdrop-blur-md border shadow-lg">
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
          <Card className="bg-card/90 backdrop-blur-md border shadow-lg">
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
                    lightTheme={lightTheme as ThemeColors}
                    darkTheme={darkTheme as ThemeColors}
                    onLightThemeChange={() => {}}
                    onDarkThemeChange={() => {}}
                    onResetTheme={() => {}}
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
