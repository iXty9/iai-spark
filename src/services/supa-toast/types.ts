export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default';

export type ToastPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right';

export interface ToastAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive';
}

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  position?: ToastPosition;
  actions?: ToastAction[];
  metadata?: Record<string, any>;
  showBrowserNotification?: boolean;
  dismissible?: boolean;
  icon?: boolean;
}

export interface ToastInstance {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  timestamp: Date;
  dismissed: boolean;
  persistent: boolean;
  actions?: ToastAction[];
  metadata?: Record<string, any>;
}

export interface ToastQueue {
  toasts: ToastInstance[];
  maxToasts: number;
  defaultDuration: number;
}

export interface SupaToastConfig {
  maxToasts: number;
  defaultDuration: number;
  defaultPosition: ToastPosition;
  enableBrowserNotifications: boolean;
  enableWebSocketToasts: boolean;
  enableSonnerIntegration: boolean;
  enableShadcnIntegration: boolean;
}

export interface WebSocketToastPayload {
  title: string;
  message: string;
  type?: ToastType;
  user_id?: string;
  target_users?: string[];
  metadata?: Record<string, any>;
}