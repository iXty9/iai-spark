
import React, { useEffect, useState } from 'react';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, RotateCcw, X } from 'lucide-react';
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
    <CardFooter className="flex flex-col space-y-4 border-t bg-muted/20 px-6 py-4">
      {/* Admin Actions */}
      {isAdmin && (
        <div className="w-full">
          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-100">Admin Actions</h4>
              <p className="text-sm text-amber-700 dark:text-amber-200">
                Set your current theme as the default for all users
              </p>
            </div>
            <Button
              onClick={handleSetAsDefault}
              disabled={isSettingDefault}
              variant="outline"
              className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
            >
              {isSettingDefault ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting...
                </>
              ) : (
                "Set as Default"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onReset} 
            disabled={isSubmitting}
            size="sm"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={isSubmitting}
            size="sm"
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button 
            onClick={onSave} 
            disabled={isSubmitting || !hasChanges}
            size="sm"
            className="flex items-center gap-2"
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
    </CardFooter>
  );
}
