
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SettingsActionsProps {
  onSave: () => void;
  onReset: () => void;
  onSetDefault?: () => void;
  isSubmitting: boolean;
  hasChanges: boolean;
}

export function SettingsActions({
  onSave,
  onReset,
  onSetDefault,
  isSubmitting,
  hasChanges
}: SettingsActionsProps) {
  return (
    <div className="flex justify-end space-x-4 mt-6">
      {hasChanges ? (
        <>
          <Button 
            variant="outline" 
            onClick={onReset}
            disabled={isSubmitting}
          >
            Reset Changes
          </Button>
          <Button 
            onClick={onSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </>
      ) : onSetDefault ? (
        <Button 
          variant="outline" 
          onClick={onSetDefault}
        >
          Set as Default
        </Button>
      ) : null}
    </div>
  );
}
