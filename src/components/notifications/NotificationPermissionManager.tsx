
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
    const initializeNotifications = async () => {
      await notificationService.initialize(showNotification, canShowNotifications, user?.id);
    };
    initializeNotifications();
  }, [showNotification, canShowNotifications, user?.id]);

  useEffect(() => {
    // Only request permission if notifications are supported
    // Removed automatic permission request to fix browser warning
    // Permissions should be requested on user interaction instead
    if (isSupported) {
      logger.info('Browser notifications supported, waiting for user interaction to request permission', { 
        module: 'notification-permission' 
      });
    } else {
      logger.info('Browser notifications not supported', { 
        module: 'notification-permission' 
      });
    }
  }, [isSupported]);

  // This component doesn't render anything, it just manages permissions
  return null;
};
