
import React, { useState, useEffect } from 'react';
import { useDevMode } from '@/store/use-dev-mode';
import { Button } from '@/components/ui/button';
import { Bug, AlertTriangle } from 'lucide-react';

export const DebugPanelIndicator: React.FC = () => {
  const { isDevMode, toggleDevMode } = useDevMode();
  const [panelVisible, setPanelVisible] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Check if debug panel is actually rendered
    const checkPanelVisibility = () => {
      const debugPanel = document.querySelector('[data-debug-panel]');
      setPanelVisible(!!debugPanel);
    };

    checkPanelVisibility();
    const interval = setInterval(checkPanelVisibility, 1000);

    // Show fallback after 3 seconds if dev mode is on but panel isn't visible
    if (isDevMode && !panelVisible) {
      const timeout = setTimeout(() => setShowFallback(true), 3000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    return () => clearInterval(interval);
  }, [isDevMode, panelVisible]);

  // Hide if not in development
  if (process.env.NODE_ENV === 'production') return null;

  // Show indicator only when dev mode is on but panel isn't visible
  if (!isDevMode || panelVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[10000]">
      <div className="bg-yellow-500 text-black p-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4" />
        <span>Debug panel not visible</span>
        {showFallback && (
          <Button
            size="sm"
            variant="outline"
            onClick={toggleDevMode}
            className="ml-2 h-6 text-xs"
          >
            <Bug className="h-3 w-3 mr-1" />
            Toggle
          </Button>
        )}
      </div>
    </div>
  );
};
