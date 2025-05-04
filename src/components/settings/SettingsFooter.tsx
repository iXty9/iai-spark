
import React from 'react';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/services/admin/userRolesService';

interface SettingsFooterProps {
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
  onSetDefault?: () => void;
  isSubmitting?: boolean;
  hasChanges?: boolean;
}

export function SettingsFooter({ 
  onReset, 
  onCancel, 
  onSave, 
  onSetDefault, 
  isSubmitting = false, 
  hasChanges = false 
}: SettingsFooterProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);
  
  React.useEffect(() => {
    // Check if the user is an admin
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        const adminStatus = await checkIsAdmin();
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();
  }, [user]);

  return (
    <CardFooter className="flex justify-between border-t pt-4">
      <div className="flex space-x-2">
        <Button variant="outline" onClick={onReset} disabled={isSubmitting}>
          Reset to Defaults
        </Button>
        
        {isAdmin && onSetDefault && (
          <Button 
            variant="outline" 
            onClick={onSetDefault} 
            disabled={isSubmitting}
            className="border-amber-500 hover:bg-amber-500/10"
          >
            Set Default Theme
          </Button>
        )}
      </div>
      <div className="space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={onSave} 
          disabled={isSubmitting || !hasChanges}
          className={!hasChanges ? 'opacity-50' : ''}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </CardFooter>
  );
}
