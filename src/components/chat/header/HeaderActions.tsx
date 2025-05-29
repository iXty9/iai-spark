
import React from 'react';
import { UserMenu } from '@/components/UserMenu';
import { DebugToggleButton } from '@/components/debug/DebugToggleButton';

export const HeaderActions: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <DebugToggleButton />
      <UserMenu />
    </div>
  );
};
