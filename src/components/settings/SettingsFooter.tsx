
import React, { useEffect, useState } from 'react';
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
    <div className="space-y-4 pt-6 border-t">
      {/* Admin Actions */}
      {isAdmin && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Admin Actions
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-200">
                Set your current saved theme as the default for all new users
              </p>
            </div>
            <Button
              onClick={handleSetAsDefault}
              disabled={isSettingDefault || hasChanges}
              variant="outline"
              size="sm"
              className="border-amber-300 hover:bg-amber-100 dark:border-amber-700"
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
      )}

      {/* Main Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <Button 
          variant="outline" 
          onClick={onReset} 
          disabled={isSubmitting}
          className="sm:w-auto"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-muted-foreground">
              • Unsaved changes
            </span>
          )}
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={isSubmitting || !hasChanges}
            className="sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            {hasChanges ? 'Discard Changes' : 'Cancel'}
          </Button>
          <Button 
            onClick={onSave} 
            disabled={isSubmitting || !hasChanges}
            className="sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
      
      {/* Help Text */}
      <div className="text-center bg-muted/50 rounded-lg p-3">
        <p className="text-sm text-muted-foreground">
          {hasChanges 
            ? "💡 You have unsaved changes that will be lost if you navigate away." 
            : "✅ All changes are saved and applied to your theme."
          }
        </p>
      </div>
    </div>
  );
}
