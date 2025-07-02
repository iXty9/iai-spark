import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  sender?: string;
  read_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
  source?: string;
}

class NotificationCenterService {
  private listeners: ((notifications: UserNotification[]) => void)[] = [];

  /**
   * Get notifications for the current user
   */
  async getUserNotifications(limit: number = 25): Promise<UserNotification[]> {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to fetch user notifications', error, { module: 'notification-center' });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching notifications', error, { module: 'notification-center' });
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null);

      if (error) {
        logger.error('Failed to fetch unread count', error, { module: 'notification-center' });
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error fetching unread count', error, { module: 'notification-center' });
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        logger.error('Failed to mark notification as read', error, { module: 'notification-center' });
        return false;
      }

      this.notifyListeners();
      return true;
    } catch (error) {
      logger.error('Error marking notification as read', error, { module: 'notification-center' });
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);

      if (error) {
        logger.error('Failed to mark all notifications as read', error, { module: 'notification-center' });
        return false;
      }

      this.notifyListeners();
      return true;
    } catch (error) {
      logger.error('Error marking all notifications as read', error, { module: 'notification-center' });
      return false;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        logger.error('Failed to delete notification', error, { module: 'notification-center' });
        return false;
      }

      this.notifyListeners();
      return true;
    } catch (error) {
      logger.error('Error deleting notification', error, { module: 'notification-center' });
      return false;
    }
  }

  /**
   * Store notification from websocket
   */
  async storeNotification(notification: Omit<UserNotification, 'id' | 'created_at' | 'user_id'>, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          sender: notification.sender,
          metadata: notification.metadata,
          source: notification.source || 'websocket'
        });

      if (error) {
        logger.error('Failed to store notification', error, { module: 'notification-center' });
        return false;
      }

      this.notifyListeners();
      return true;
    } catch (error) {
      logger.error('Error storing notification', error, { module: 'notification-center' });
      return false;
    }
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(callback: (notifications: UserNotification[]) => void): () => void {
    this.listeners.push(callback);
    
    // Initial load
    this.getUserNotifications().then(notifications => {
      callback(notifications);
    });

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private async notifyListeners(): Promise<void> {
    const notifications = await this.getUserNotifications();
    this.listeners.forEach(callback => {
      try {
        callback(notifications);
      } catch (error) {
        logger.error('Error in notification listener', error, { module: 'notification-center' });
      }
    });
  }
}

export const notificationCenterService = new NotificationCenterService();