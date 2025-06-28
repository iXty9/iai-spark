
import React, { useEffect } from 'react';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';
import { notificationService } from '@/services/notification-service';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';

export const NotificationPermissionManager: React.FC = () => {
  const { requestPermission, showNotification, canShowNotifications, isSupported } = useBrowserNotifications();
  const { user } = useAuth();

  useEffect(() => {
    // Initialize the notification service
    notificationService.initialize(showNotification, canShowNotifications);
  }, [showNotification, canShowNotifications]);

  useEffect(() => {
    // Request permission immediately when the app loads
    const requestNotificationPermission = async () => {
      if (!isSupported) {
        logger.info('Browser notifications not supported, skipping permission request', { 
          module: 'notification-permission' 
        });
        return;
      }

      try {
        const permission = await requestPermission();
        
        if (permission === 'granted') {
          logger.info('Notification permission granted', { module: 'notification-permission' });
        } else if (permission === 'denied') {
          logger.warn('Notification permission denied by user', { module: 'notification-permission' });
        } else {
          logger.info('Notification permission dismissed', { module: 'notification-permission' });
        }
      } catch (error) {
        logger.error('Error requesting notification permission', error, { module: 'notification-permission' });
      }
    };

    // Small delay to ensure the app has fully loaded
    const timeoutId = setTimeout(requestNotificationPermission, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [isSupported, requestPermission]);

  // This component doesn't render anything, it just manages permissions
  return null;
};
