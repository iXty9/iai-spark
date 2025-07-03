
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';
import { soundService } from '@/services/sound/sound-service';

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
  private currentUserId: string | null = null;

  initialize(
    showBrowserNotification: (options: { title: string; body: string; icon?: string; tag?: string }) => Notification | null,
    canShow: boolean,
    userId?: string
  ) {
    this.showBrowserNotification = showBrowserNotification;
    this.canShowBrowserNotifications = canShow;
    this.currentUserId = userId || null;
    
    // Initialize sound service
    soundService.initialize(this.currentUserId || undefined);
    
    logger.info('Notification service initialized', { 
      canShowBrowserNotifications: canShow,
      hasUserId: !!this.currentUserId,
      module: 'notification-service' 
    });
  }

  private isPageVisible(): boolean {
    return document.visibilityState === 'visible' && document.hasFocus();
  }

  async showNotification(options: NotificationOptions) {
    const { title, message, sender, type = 'info', showBrowserNotification = true } = options;
    
    logger.debug('Showing notification', { 
      title, 
      sender, 
      type, 
      hasUserId: !!this.currentUserId,
      module: 'notification-service' 
    });
    
    // Always show toast notification for immediate feedback
    toast({
      title: sender ? `${sender}` : title,
      description: message,
      variant: type === 'error' ? 'destructive' : 'default'
    });

    // Play notification sound
    if (this.currentUserId) {
      logger.debug('Playing notification sound from service', { 
        userId: this.currentUserId,
        module: 'notification-service' 
      });
      await soundService.playNotificationSound(this.currentUserId);
    } else {
      logger.warn('No current user ID for notification sound', { module: 'notification-service' });
    }

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

  async showProactiveMessage(message: string, sender?: string) {
    // Play chat message sound
    if (this.currentUserId) {
      await soundService.playChatMessageSound(this.currentUserId);
    }
    
    await this.showNotification({
      title: 'New Message',
      message,
      sender,
      type: 'info',
      showBrowserNotification: true
    });
  }

  async showChatMessage(message: string, sender?: string) {
    logger.debug('Processing chat message for sound', { 
      sender, 
      hasUserId: !!this.currentUserId,
      module: 'notification-service' 
    });
    
    // Play chat message sound for regular chat messages
    if (this.currentUserId) {
      logger.debug('Playing chat message sound from service', { 
        userId: this.currentUserId,
        sender,
        module: 'notification-service' 
      });
      await soundService.playChatMessageSound(this.currentUserId);
    } else {
      logger.warn('No current user ID for chat message sound', { sender, module: 'notification-service' });
    }
    
    // Don't show toast for regular chat messages, just play sound
    logger.debug('Chat message sound processing completed', { sender, module: 'notification-service' });
  }

  setUserId(userId: string | null) {
    this.currentUserId = userId;
    if (userId) {
      soundService.initialize(userId);
    }
  }
}

export const notificationService = new NotificationService();
