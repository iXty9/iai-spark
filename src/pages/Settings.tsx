
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useDraftSettingsState } from '@/hooks/settings/use-draft-settings-state';
import { useDraftSettingsActions } from '@/hooks/settings/use-draft-settings-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette, Image, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { theme } = useTheme();

  const {
    draftState,
    isInitialized,
    isSubmitting,
    isLoading,
    hasChanges,
    imageInfo,
    updateDraftLightTheme,
    updateDraftDarkTheme,
    updateDraftBackgroundImage,
    updateDraftBackgroundOpacity,
    updateDraftMode,
    saveChanges,
    discardChanges,
    resetToDefaults,
    refreshSettings
  } = useDraftSettingsState();

  const {
    handleLightThemeChange,
    handleDarkThemeChange,
    handleBackgroundImageUpload,
    handleRemoveBackground,
    handleOpacityChange,
    handleSaveSettings,
    handleCancelSettings,
    handleResetSettings,
    isBackgroundLoading
  } = useDraftSettingsActions({
    user,
    theme,
    lightTheme: draftState?.lightTheme || {} as any,
    darkTheme: draftState?.darkTheme || {} as any,
    backgroundImage: draftState?.backgroundImage || null,
    backgroundOpacity: draftState?.backgroundOpacity || 0.5,
    updateDraftLightTheme,
    updateDraftDarkTheme,
    updateDraftBackgroundImage,
    updateDraftBackgroundOpacity,
    updateDraftMode,
    saveChanges,
    discardChanges,
    resetToDefaults,
    updateProfile
  });

  // Create wrapper functions to match AppearanceSettings prop types
  const handleLightThemeChangeWrapper = (colorKey: string, value: string | number) => {
    handleLightThemeChange({ name: colorKey, value });
  };

  const handleDarkThemeChangeWrapper = (colorKey: string, value: string | number) => {
    handleDarkThemeChange({ name: colorKey, value });
  };

  // FIXED: Handle theme mode changes through draft state system
  const handleThemeModeChange = (mode: 'light' | 'dark') => {
    updateDraftMode(mode);
  };

  const handleGoBack = () => {
    if (hasChanges) {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      );
      if (!confirmLeave) return;
      
      // Discard changes before navigating
      discardChanges();
    }
    navigate('/');
  };

  const handleRefresh = async () => {
    await refreshSettings();
  };

  // Show loading state while theme service initializes
  if (isLoading || !isInitialized || !draftState) {
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
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
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
                theme={draftState.mode || theme}
                lightTheme={draftState.lightTheme}
                darkTheme={draftState.darkTheme}
                onLightThemeChange={handleLightThemeChangeWrapper}
                onDarkThemeChange={handleDarkThemeChangeWrapper}
                onResetTheme={handleResetSettings}
                onThemeModeChange={handleThemeModeChange}
              />
            </TabsContent>
            
            <TabsContent value="background" className="space-y-6">
              <BackgroundSettings
                backgroundImage={draftState.backgroundImage}
                backgroundOpacity={draftState.backgroundOpacity}
                imageInfo={imageInfo}
                onBackgroundImageUpload={handleBackgroundImageUpload}
                onRemoveBackground={handleRemoveBackground}
                onOpacityChange={handleOpacityChange}
                isLoading={isBackgroundLoading}
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
