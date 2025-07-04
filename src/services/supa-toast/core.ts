import { toast as shadcnToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { notificationService } from '@/services/notification-service';
import { soundService } from '@/services/sound/sound-service';
import { logger } from '@/utils/logging';
import { 
  ToastOptions, 
  ToastInstance, 
  SupaToastConfig, 
  ToastType, 
  WebSocketToastPayload 
} from './types';
import { DEFAULT_CONFIG, TOAST_DURATIONS, TOAST_ICONS } from './config';

class SupaToastService {
  private config: SupaToastConfig;
  private queue: ToastInstance[] = [];
  private listeners: ((toasts: ToastInstance[]) => void)[] = [];

  constructor(config: Partial<SupaToastConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update the service configuration
   */
  public configure(config: Partial<SupaToastConfig>): void {
    this.config = { ...this.config, ...config };
    logger.debug('SupaToast configuration updated', { config: this.config }, { module: 'supa-toast' });
  }

  /**
   * Main toast creation method
   */
  public show(options: ToastOptions): string {
    const toastId = this.generateId();
    const duration = options.duration ?? TOAST_DURATIONS[options.type || 'default'];
    
    const toastInstance: ToastInstance = {
      id: toastId,
      type: options.type || 'default',
      title: options.title,
      message: options.message,
      timestamp: new Date(),
      dismissed: false,
      persistent: options.persistent || false,
      actions: options.actions,
      metadata: options.metadata,
    };

    // Add to internal queue
    this.addToQueue(toastInstance);

    // Show via shadcn if enabled
    if (this.config.enableShadcnIntegration) {
      this.showShadcnToast(options, toastId);
    }

    // Show via sonner if enabled and shadcn is disabled
    if (this.config.enableSonnerIntegration && !this.config.enableShadcnIntegration) {
      this.showSonnerToast(options);
    }

    // Play toast notification sound and show browser notification if requested
    if (options.showBrowserNotification && this.config.enableBrowserNotifications) {
      this.showBrowserNotification(options);
    }
    
    // Only play toast notification sound for webhook-initiated toasts
    if (options.metadata?.source === 'websocket') {
      this.playToastSound();
    }

    // Auto-dismiss if not persistent
    if (!options.persistent && duration > 0) {
      setTimeout(() => {
        this.dismiss(toastId);
      }, duration);
    }

    logger.debug('Toast created', { toastId, options }, { module: 'supa-toast' });
    return toastId;
  }

  /**
   * Convenience methods for different toast types
   */
  public success(message: string, options: Partial<ToastOptions> = {}): string {
    return this.show({ ...options, type: 'success', message });
  }

  public error(message: string, options: Partial<ToastOptions> = {}): string {
    return this.show({ ...options, type: 'error', message });
  }

  public warning(message: string, options: Partial<ToastOptions> = {}): string {
    return this.show({ ...options, type: 'warning', message });
  }

  public info(message: string, options: Partial<ToastOptions> = {}): string {
    return this.show({ ...options, type: 'info', message });
  }

  /**
   * Handle WebSocket toast notifications
   */
  public handleWebSocketToast(payload: WebSocketToastPayload): void {
    if (!this.config.enableWebSocketToasts) {
      return;
    }

    const options: ToastOptions = {
      type: payload.type || 'info',
      title: payload.title,
      message: payload.message,
      metadata: {
        source: 'websocket',
        ...payload.metadata
      },
      showBrowserNotification: true,
    };

    this.show(options);
    logger.info('WebSocket toast handled', { payload }, { module: 'supa-toast' });
  }

  /**
   * Dismiss a specific toast
   */
  public dismiss(toastId: string): void {
    const toast = this.queue.find(t => t.id === toastId);
    if (toast && !toast.dismissed) {
      toast.dismissed = true;
      this.notifyListeners();
      logger.debug('Toast dismissed', { toastId }, { module: 'supa-toast' });
    }
  }

  /**
   * Dismiss all toasts
   */
  public dismissAll(): void {
    this.queue.forEach(toast => {
      toast.dismissed = true;
    });
    this.notifyListeners();
    logger.debug('All toasts dismissed', null, { module: 'supa-toast' });
  }

  /**
   * Clear dismissed toasts from queue
   */
  public clearDismissed(): void {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(toast => !toast.dismissed);
    
    if (this.queue.length < initialLength) {
      this.notifyListeners();
      logger.debug('Dismissed toasts cleared', { 
        removed: initialLength - this.queue.length 
      }, { module: 'supa-toast' });
    }
  }

  /**
   * Get current toast queue
   */
  public getQueue(): ToastInstance[] {
    return [...this.queue];
  }

  /**
   * Get active (non-dismissed) toasts
   */
  public getActiveToasts(): ToastInstance[] {
    return this.queue.filter(toast => !toast.dismissed);
  }

  /**
   * Subscribe to toast queue changes
   */
  public subscribe(listener: (toasts: ToastInstance[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Private methods
   */
  private generateId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToQueue(toast: ToastInstance): void {
    this.queue.push(toast);
    
    // Enforce max toasts limit
    if (this.queue.length > this.config.maxToasts) {
      // Remove oldest non-persistent toasts first
      const nonPersistent = this.queue.filter(t => !t.persistent && !t.dismissed);
      if (nonPersistent.length > 0) {
        const oldest = nonPersistent[0];
        oldest.dismissed = true;
      } else {
        // If all are persistent, remove the oldest one anyway
        this.queue.shift();
      }
    }
    
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getQueue());
      } catch (error) {
        logger.error('Error in toast queue listener', error, { module: 'supa-toast' });
      }
    });
  }

  private showShadcnToast(options: ToastOptions, toastId: string): void {
    const variant = options.type === 'error' ? 'destructive' : 'default';
    
    const toastOptions: any = {
      title: options.title,
      description: options.message,
      variant,
    };

    // Add actions if provided
    if (options.actions && options.actions.length > 0) {
      const primaryAction = options.actions[0];
      toastOptions.action = {
        altText: primaryAction.label,
        onClick: primaryAction.action,
      };
    }

    shadcnToast(toastOptions);
  }

  private showSonnerToast(options: ToastOptions): void {
    const message = options.title 
      ? `${options.title}: ${options.message}`
      : options.message;

    switch (options.type) {
      case 'success':
        sonnerToast.success(message);
        break;
      case 'error':
        sonnerToast.error(message);
        break;
      case 'warning':
        sonnerToast.warning(message);
        break;
      case 'info':
        sonnerToast.info(message);
        break;
      default:
        sonnerToast(message);
        break;
    }
  }

  private showBrowserNotification(options: ToastOptions): void {
    const notificationType = options.type === 'default' ? 'info' : options.type || 'info';
    logger.debug('Showing browser notification from toast', { 
      title: options.title,
      type: notificationType,
      module: 'supa-toast' 
    });
    
    // Only show browser notification, don't play sound here (sound is handled separately)
    notificationService.showNotification({
      title: options.title || 'Notification',
      message: options.message,
      type: notificationType as 'success' | 'error' | 'warning' | 'info',
      showBrowserNotification: true,
    });
  }

  private async playToastSound(): Promise<void> {
    try {
      // Get current user ID from notification service
      const currentUserId = notificationService.getCurrentUserId();
      
      if (currentUserId) {
        logger.debug('Playing toast notification sound', { userId: currentUserId }, { module: 'supa-toast' });
        await soundService.playNotificationSound(currentUserId);
      } else {
        logger.debug('No user ID available for toast sound', null, { module: 'supa-toast' });
      }
    } catch (error) {
      logger.debug('Could not play toast sound', { error }, { module: 'supa-toast' });
    }
  }
}

// Create singleton instance
export const supaToast = new SupaToastService();

// Export class for custom instances if needed
export { SupaToastService };