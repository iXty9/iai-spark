
import React from 'react';
import { CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SettingsFooterProps {
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function SettingsFooter({ onReset, onCancel, onSave }: SettingsFooterProps) {
  return (
    <CardFooter className="flex justify-between">
      <Button variant="outline" onClick={onReset}>
        Reset to Defaults
      </Button>
      <div className="space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>
          Save Changes
        </Button>
      </div>
    </CardFooter>
  );
}
