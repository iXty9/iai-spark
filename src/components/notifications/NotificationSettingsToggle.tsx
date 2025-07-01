import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';

export const NotificationSettingsToggle: React.FC = () => {
  const { permission, requestPermission, isSupported } = useBrowserNotifications();
  const { toast } = useToast();

  const handleToggleNotifications = async () => {
    if (!isSupported) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Browser notifications are not supported in this browser.",
      });
      return;
    }

    if (permission === 'denied') {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Notifications are blocked. Please enable them in your browser settings.",
      });
      return;
    }

    if (permission === 'default') {
      try {
        const result = await requestPermission();
        
        if (result === 'granted') {
          toast({
            title: "Notifications Enabled",
            description: "You'll now receive browser notifications when the app is in the background.",
          });
          logger.info('Notification permission granted via user interaction', { module: 'notification-settings' });
        } else {
          toast({
            variant: "destructive",
            title: "Permission Denied",
            description: "Notification permission was not granted.",
          });
        }
      } catch (error) {
        logger.error('Error requesting notification permission via toggle', error, { module: 'notification-settings' });
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to request notification permission.",
        });
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggleNotifications}
      className="flex items-center gap-2"
    >
      {permission === 'granted' ? (
        <>
          <Bell className="h-4 w-4" />
          Notifications On
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          Enable Notifications
        </>
      )}
    </Button>
  );
};