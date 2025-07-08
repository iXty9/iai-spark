import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';
import { supaToast } from '@/services/supa-toast';
import { logger } from '@/utils/logging';

export const NotificationSettingsToggle: React.FC = () => {
  const { permission, requestPermission, isSupported } = useBrowserNotifications();

  const handleToggleNotifications = async () => {
    if (!isSupported) {
      supaToast.error("Browser notifications are not supported in this browser.", {
        title: "Not Supported"
      });
      return;
    }

    if (permission === 'denied') {
      supaToast.error("Notifications are blocked. Please enable them in your browser settings.", {
        title: "Permission Denied"
      });
      return;
    }

    if (permission === 'default') {
      try {
        const result = await requestPermission();
        
        if (result === 'granted') {
          supaToast.success("You'll now receive browser notifications when the app is in the background.", {
            title: "Notifications Enabled"
          });
          logger.info('Notification permission granted via user interaction', { module: 'notification-settings' });
        } else {
          supaToast.error("Notification permission was not granted.", {
            title: "Permission Denied"
          });
        }
      } catch (error) {
        logger.error('Error requesting notification permission via toggle', error, { module: 'notification-settings' });
        supaToast.error("Failed to request notification permission.", {
          title: "Error"
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