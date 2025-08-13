import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';

export interface CacheUpdateNotificationProps {
  onDismiss?: () => void;
  onUpdate?: () => void;
}

export const CacheUpdateNotification: React.FC<CacheUpdateNotificationProps> = ({
  onDismiss,
  onUpdate
}) => {
  const { updateApp, isUpdating } = usePWA();

  const handleUpdate = async () => {
    await updateApp();
    onUpdate?.();
  };

  return (
    <Card className="w-full max-w-sm border-primary/20 bg-background/95 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">
              Update Available
            </CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          A new version is ready with improvements and bug fixes. Your settings will be preserved.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Now'
            )}
          </Button>
          {onDismiss && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              disabled={isUpdating}
            >
              Later
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};