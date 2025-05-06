
import React, { useState } from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { ThemeImportExport } from '@/components/settings/ThemeImportExport';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { useTheme } from '@/hooks/use-theme';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Placeholder settings handlers
  const handleSave = () => {
    setIsSubmitting(true);
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
      duration: 3000,
    });
    setTimeout(() => {
      setIsSubmitting(false);
      setHasChanges(false);
    }, 1000);
  };
  
  const handleReset = () => {
    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults.",
      duration: 3000,
    });
    setHasChanges(false);
  };
  
  const handleCancel = () => {
    navigate('/');
  };
  
  const handleImportTheme = (theme: any) => {
    toast({
      title: "Theme imported",
      description: "The new theme has been applied.",
      duration: 3000,
    });
    setHasChanges(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SettingsHeader />
      
      <main className="flex-1 container max-w-4xl mx-auto p-4 pt-0">
        <SettingsTabs>
          <TabsContent value="appearance" className="space-y-6 mt-4">
            <h3 className="text-lg font-medium">Theme Appearance</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the colors and appearance of the application
            </p>
            
            <div className="border rounded-lg p-4">
              <p>Theme customization coming soon...</p>
            </div>
          </TabsContent>
          
          <TabsContent value="background" className="space-y-6 mt-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">Background Image</h3>
              <p>Background customization coming soon...</p>
            </div>
          </TabsContent>
          
          <TabsContent value="import-export" className="space-y-6 mt-4">
            <ThemeImportExport 
              theme={theme as any}
              onImport={handleImportTheme}
            />
          </TabsContent>
        </SettingsTabs>
      </main>

      <SettingsFooter
        onSave={handleSave}
        onReset={handleReset}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        hasChanges={hasChanges}
      />
    </div>
  );
};

export default Settings;
