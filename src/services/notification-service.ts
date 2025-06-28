
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';

interface NotificationOptions {
  title: string;
  message: string;
  sender?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  showBrowserNotification?: boolean;
}

class NotificationService {
  private showBrowserNotification: ((options: { title: string; body: string; icon?: string; tag?: string }) => Notification | null) | null = null;
  private canShowBrowserNotifications = false;

  initialize(
    showBrowserNotification: (options: { title: string; body: string; icon?: string; tag?: string }) => Notification | null,
    canShow: boolean
  ) {
    this.showBrowserNotification = showBrowserNotification;
    this.canShowBrowserNotifications = canShow;
    logger.info('Notification service initialized', { 
      canShowBrowserNotifications: canShow,
      module: 'notification-service' 
    });
  }

  private isPageVisible(): boolean {
    return document.visibilityState === 'visible' && document.hasFocus();
  }

  showNotification(options: NotificationOptions) {
    const { title, message, sender, type = 'info', showBrowserNotification = true } = options;
    
    // Always show toast notification for immediate feedback
    toast({
      title: sender ? `${sender}` : title,
      description: message,
      variant: type === 'error' ? 'destructive' : 'default'
    });

    // Show browser notification if page is not visible and we have permission
    if (
      showBrowserNotification && 
      this.canShowBrowserNotifications && 
      this.showBrowserNotification && 
      !this.isPageVisible()
    ) {
      this.showBrowserNotification({
        title: sender ? `New message from ${sender}` : title,
        body: message,
        icon: 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
        tag: 'proactive-message'
      });
      
      logger.debug('Browser notification sent (page not visible)', { 
        title,
        sender,
        module: 'notification-service' 
      });
    } else {
      logger.debug('Browser notification skipped (page visible or no permission)', { 
        pageVisible: this.isPageVisible(),
        canShow: this.canShowBrowserNotifications,
        module: 'notification-service' 
      });
    }
  }

  showProactiveMessage(message: string, sender?: string) {
    this.showNotification({
      title: 'New Message',
      message,
      sender,
      type: 'info',
      showBrowserNotification: true
    });
  }
}

export const notificationService = new NotificationService();
