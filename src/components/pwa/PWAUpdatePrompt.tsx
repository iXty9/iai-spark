
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, X, Download } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';
import { useState } from 'react';

interface PWAUpdatePromptProps {
  onDismiss?: () => void;
}

export const PWAUpdatePrompt: React.FC<PWAUpdatePromptProps> = ({ onDismiss }) => {
  const { updateApp, currentVersion, isUpdating } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  const handleUpdate = async () => {
    try {
      await updateApp();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  return (
    <Card className="border-blue-500/20 bg-gradient-to-r from-background to-blue-500/5 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-blue-500/10">
              <Download className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Update Available</CardTitle>
              <CardDescription className="text-sm">
                A new version of Ixty AI is ready to install
              </CardDescription>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {currentVersion && (
              <span>Current: {currentVersion.slice(0, 8)}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Updating...' : 'Update Now'}
            </Button>
            {onDismiss && (
              <Button variant="ghost" onClick={handleDismiss} size="sm">
                Later
              </Button>
            )}
          </div>
        </div>
        {isUpdating && (
          <div className="mt-3 text-xs text-muted-foreground">
            The app will reload automatically after the update is complete.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
