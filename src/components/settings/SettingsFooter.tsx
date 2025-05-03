
import React from 'react';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SettingsFooterProps {
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
  isSubmitting?: boolean;
  hasChanges?: boolean;
}

export function SettingsFooter({ onReset, onCancel, onSave, isSubmitting = false, hasChanges = false }: SettingsFooterProps) {
  return (
    <CardFooter className="flex justify-between border-t pt-4">
      <Button variant="outline" onClick={onReset} disabled={isSubmitting}>
        Reset to Defaults
      </Button>
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
