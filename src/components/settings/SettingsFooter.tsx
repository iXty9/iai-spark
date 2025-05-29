
import React, { useEffect, useState } from 'react';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, RotateCcw, X, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/services/admin/userRolesService';
import { useToast } from '@/hooks/use-toast';
import { setDefaultThemeSettings } from '@/services/admin/settingsService';
import { productionThemeService } from '@/services/production-theme-service';

interface SettingsFooterProps {
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
  isSubmitting?: boolean;
  hasChanges?: boolean;
}

export function SettingsFooter({ 
  onReset, 
  onCancel, 
  onSave,
  isSubmitting = false, 
  hasChanges = false 
}: SettingsFooterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        const adminStatus = await checkIsAdmin(user.id);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();
  }, [user]);

  const handleSetAsDefault = async () => {
    if (isSettingDefault) return;
    
    setIsSettingDefault(true);
    
    try {
      const currentThemeSettings = productionThemeService.createThemeSettings();
      
      const success = await setDefaultThemeSettings(currentThemeSettings);
      
      if (success) {
        toast({
          title: "Default theme set",
          description: "Your current theme settings have been set as the system default.",
        });
      } else {
        throw new Error('Failed to update default theme settings');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set default theme. Please try again.",
      });
    } finally {
      setIsSettingDefault(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20 border-t border-border/30">
      <CardFooter className="flex flex-col space-y-6 px-8 py-6">
        {/* Enhanced Admin Actions */}
        {isAdmin && (
          <div className="w-full">
            <div className="relative overflow-hidden rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-50 via-amber-50/80 to-amber-100/60 dark:border-amber-800/50 dark:from-amber-950/30 dark:via-amber-950/20 dark:to-amber-900/20 p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 pointer-events-none"></div>
              <div className="relative flex items-center justify-between">
                <div className="space-y-2">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Admin Actions
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-200 max-w-md">
                    Set your current saved theme as the default for all new users
                  </p>
                </div>
                <Button
                  onClick={handleSetAsDefault}
                  disabled={isSettingDefault || hasChanges}
                  variant="outline"
                  className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50 transition-all duration-200 font-medium"
                  title={hasChanges ? "Save your changes first before setting as default" : "Set current theme as default"}
                >
                  {isSettingDefault ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting...
                    </>
                  ) : (
                    <>
                      <Crown className="mr-2 h-4 w-4" />
                      Set as Default
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Main Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onReset} 
              disabled={isSubmitting}
              size="default"
              className="flex items-center gap-2 hover:bg-muted/50 transition-all duration-200 border-muted-foreground/20"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onCancel} 
              disabled={isSubmitting || !hasChanges}
              size="default"
              className="flex items-center gap-2 hover:bg-muted/50 transition-all duration-200 border-muted-foreground/20"
            >
              <X className="h-4 w-4" />
              {hasChanges ? 'Discard Changes' : 'Cancel'}
            </Button>
            <Button 
              onClick={onSave} 
              disabled={isSubmitting || !hasChanges}
              size="default"
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all duration-200 font-medium px-6"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
        
        {/* Enhanced Help Text */}
        <div className="w-full text-center bg-gradient-to-r from-muted/10 via-muted/5 to-muted/10 rounded-lg p-4 border border-border/10">
          <p className="text-sm text-muted-foreground/80">
            {hasChanges 
              ? "💡 You have unsaved changes that will be lost if you navigate away." 
              : "✅ All changes are saved and applied to your theme."
            }
          </p>
        </div>
      </CardFooter>
    </div>
  );
}
