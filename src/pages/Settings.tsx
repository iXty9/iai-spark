
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useSimplifiedSettingsState } from '@/hooks/settings/use-simplified-settings-state';
import { useSimplifiedSettingsActions } from '@/hooks/settings/use-simplified-settings-actions';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { SettingsFooter } from '@/components/settings/SettingsFooter';

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { theme } = useTheme();

  const {
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity,
    isSubmitting,
    hasChanges,
    imageInfo,
    isInitialized
  } = useSimplifiedSettingsState();

  const {
    handleLightThemeChange,
    handleDarkThemeChange,
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    handleSaveSettings,
    handleResetSettings,
    isBackgroundLoading
  } = useSimplifiedSettingsActions({
    user,
    theme,
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity,
    setHasChanges: () => {},
    updateProfile
  });

  // Create wrapper functions to match AppearanceSettings prop types
  const handleLightThemeChangeWrapper = (colorKey: string, value: string | number) => {
    handleLightThemeChange({ name: colorKey, value });
  };

  const handleDarkThemeChangeWrapper = (colorKey: string, value: string | number) => {
    handleDarkThemeChange({ name: colorKey, value });
  };

  const handleGoBack = () => {
    navigate('/');
  };

  // Show loading state while theme service initializes
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded mb-6"></div>
              <div className="h-64 bg-muted rounded mb-4"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center space-x-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleGoBack}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Customize your app experience</p>
            </div>
          </div>
          
          {/* Main Settings Card with Glass Effect */}
          <Card className="card">
            <Tabs defaultValue="appearance" className="w-full">
              <div className="border-b px-6 pt-6">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="appearance" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <span>Appearance</span>
                  </TabsTrigger>
                  <TabsTrigger value="background" className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    <span>Background</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="px-6 py-6">
                <TabsContent value="appearance" className="mt-0">
                  <AppearanceSettings
                    theme={theme}
                    lightTheme={lightTheme}
                    darkTheme={darkTheme}
                    onLightThemeChange={handleLightThemeChangeWrapper}
                    onDarkThemeChange={handleDarkThemeChangeWrapper}
                    onResetTheme={handleResetSettings}
                  />
                </TabsContent>
                
                <TabsContent value="background" className="mt-0">
                  <BackgroundSettings
                    backgroundImage={backgroundImage}
                    backgroundOpacity={backgroundOpacity}
                    imageInfo={imageInfo}
                    onBackgroundImageUpload={handleBackgroundImageUpload}
                    onRemoveBackground={handleRemoveBackground}
                    onOpacityChange={handleOpacityChange}
                    isLoading={isBackgroundLoading}
                  />
                </TabsContent>
              </div>
            </Tabs>
            
            {/* Footer Actions */}
            <SettingsFooter 
              onReset={handleResetSettings}
              onCancel={handleGoBack}
              onSave={handleSaveSettings}
              isSubmitting={isSubmitting}
              hasChanges={hasChanges}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
