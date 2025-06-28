
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logging';

type NotificationPermission = 'default' | 'granted' | 'denied';

interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      logger.info('Browser notifications supported', { 
        permission: Notification.permission,
        module: 'notifications' 
      });
    } else {
      logger.warn('Browser notifications not supported', { module: 'notifications' });
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      logger.warn('Cannot request permission: notifications not supported', { module: 'notifications' });
      return 'denied';
    }

    if (permission === 'granted') {
      return 'granted';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      logger.info('Notification permission requested', { 
        result, 
        module: 'notifications' 
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to request notification permission', error, { module: 'notifications' });
      return 'denied';
    }
  }, [isSupported, permission]);

  const showNotification = useCallback((options: BrowserNotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      logger.warn('Cannot show notification: not supported or permission denied', { 
        isSupported, 
        permission,
        module: 'notifications' 
      });
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: false,
        silent: false
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      logger.debug('Browser notification shown', { 
        title: options.title,
        module: 'notifications' 
      });

      return notification;
    } catch (error) {
      logger.error('Failed to show browser notification', error, { module: 'notifications' });
      return null;
    }
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    canShowNotifications: isSupported && permission === 'granted'
  };
};
