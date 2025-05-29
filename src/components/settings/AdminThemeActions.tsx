
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { setDefaultThemeSettings } from '@/services/admin/settingsService';
import { unifiedThemeController } from '@/services/unified-theme-controller';
import { logger } from '@/utils/logging';
import { Crown } from 'lucide-react';

export const AdminThemeActions = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  // Check if user is admin (you may need to adjust this based on your role system)
  const isAdmin = profile?.id; // For now, assuming any authenticated user can be admin
  // TODO: Replace with proper role check when user_roles table is implemented

  const handleSetAsDefault = async () => {
    if (isSettingDefault) return;
    
    setIsSettingDefault(true);
    
    try {
      // Get current theme settings from unified controller
      const currentThemeSettings = unifiedThemeController.createThemeSettings();
      
      logger.info('Setting current theme as default', { 
        module: 'admin-theme',
        hasBackground: !!currentThemeSettings.backgroundImage
      });

      const success = await setDefaultThemeSettings(currentThemeSettings);
      
      if (success) {
        toast({
          title: "Default theme set",
          description: "Your current theme settings have been set as the system default for new users",
        });
      } else {
        throw new Error('Failed to update default theme settings');
      }
    } catch (error) {
      logger.error('Error setting default theme:', error, { module: 'admin-theme' });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set default theme. Please try again.",
      });
    } finally {
      setIsSettingDefault(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Crown className="h-5 w-5 text-yellow-500" />
        Admin Actions
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Set your current theme (including background image) as the default theme for all new users.
      </p>
      <Button
        onClick={handleSetAsDefault}
        disabled={isSettingDefault}
        variant="outline"
        className="w-full"
      >
        {isSettingDefault ? "Setting as Default..." : "Set Current Theme as Default"}
      </Button>
    </div>
  );
};
