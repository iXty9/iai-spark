import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationCenterService, UserNotification } from '@/services/notification/notification-center-service';
import { logger } from '@/utils/logging';

export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    const unsubscribe = notificationCenterService.subscribe((newNotifications) => {
      setNotifications(newNotifications);
      const unread = newNotifications.filter(n => !n.read_at).length;
      setUnreadCount(unread);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    await notificationCenterService.markAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    await notificationCenterService.markAllAsRead();
  };

  const deleteNotification = async (notificationId: string) => {
    await notificationCenterService.deleteNotification(notificationId);
  };

  const storeNotification = async (notification: Omit<UserNotification, 'id' | 'created_at' | 'user_id'>) => {
    if (user) {
      await notificationCenterService.storeNotification(notification, user.id);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    storeNotification
  };
}