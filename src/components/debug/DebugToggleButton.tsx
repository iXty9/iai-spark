
import React from 'react';
import { useDevMode } from '@/store/use-dev-mode';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const DebugToggleButton: React.FC = () => {
  const { isDevMode, toggleDevMode } = useDevMode();

  // Only show in development
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isDevMode ? "default" : "outline"}
            size="icon"
            onClick={toggleDevMode}
            className={`h-8 w-8 ${isDevMode ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            <Bug className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Debug Panel (Ctrl+Shift+D)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
