
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useDraftSettingsState } from '@/hooks/settings/use-draft-settings-state';
import { useDraftSettingsActions } from '@/hooks/settings/use-draft-settings-actions';
import { Card } from '@/components/ui/card';
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-12 bg-gradient-to-r from-muted via-muted/80 to-muted rounded-lg mb-8"></div>
              <div className="h-96 bg-gradient-to-br from-muted via-muted/90 to-muted/80 rounded-xl shadow-lg mb-6"></div>
              <div className="h-24 bg-gradient-to-r from-muted/80 via-muted to-muted/80 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Enhanced Page Header */}
          <div className="relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-6">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleGoBack}
                  className="h-10 w-10 rounded-full hover:bg-muted/60 transition-all duration-200 hover:scale-105"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Settings
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Customize your app experience
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 hover:bg-muted/50 transition-all duration-200 border-muted-foreground/20"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </div>

          {/* Enhanced Unsaved Changes Alert */}
          {hasChanges && (
            <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:border-amber-800 dark:from-amber-950/20 dark:to-amber-950/10">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                You have unsaved changes. Make sure to save your settings before leaving this page.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Enhanced Main Settings Card */}
          <Card className="shadow-xl border-0 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
            <div className="relative">
              <Tabs defaultValue="appearance" className="w-full">
                <div className="border-b border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30">
                  <div className="px-8 pt-8 pb-6">
                    <TabsList className="grid w-full grid-cols-2 bg-background/50 backdrop-blur-sm border border-border/20 p-1 h-12">
                      <TabsTrigger 
                        value="appearance" 
                        className="flex items-center gap-3 text-sm font-medium h-10 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                      >
                        <Palette className="h-4 w-4" />
                        <span>Appearance</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="background" 
                        className="flex items-center gap-3 text-sm font-medium h-10 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
                      >
                        <Image className="h-4 w-4" />
                        <span>Background</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>
                
                <div className="px-8 py-8">
                  <TabsContent value="appearance" className="mt-0">
                    <div className="space-y-8">
                      <AppearanceSettings
                        theme={theme}
                        lightTheme={draftState.lightTheme}
                        darkTheme={draftState.darkTheme}
                        onLightThemeChange={handleLightThemeChangeWrapper}
                        onDarkThemeChange={handleDarkThemeChangeWrapper}
                        onResetTheme={handleResetSettings}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="background" className="mt-0">
                    <div className="space-y-8">
                      <BackgroundSettings
                        backgroundImage={draftState.backgroundImage}
                        backgroundOpacity={draftState.backgroundOpacity}
                        imageInfo={imageInfo}
                        onBackgroundImageUpload={handleBackgroundImageUpload}
                        onRemoveBackground={handleRemoveBackground}
                        onOpacityChange={handleOpacityChange}
                        isLoading={isBackgroundLoading}
                      />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
              
              {/* Enhanced Footer */}
              <SettingsFooter 
                onReset={handleResetSettings}
                onCancel={handleCancelSettings}
                onSave={handleSaveSettings}
                isSubmitting={isSubmitting}
                hasChanges={hasChanges}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
