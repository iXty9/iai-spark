
type EventCallback<T> = (data: T) => void;

class EventBus {
  private listeners: { [event: string]: EventCallback<any>[] } = {};

  subscribe<T>(event: string, callback: EventCallback<T>): { unsubscribe: () => void } {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);

    return {
      unsubscribe: () => {
        this.listeners[event] = this.listeners[event].filter(listener => listener !== callback);
      }
    };
  }

  publish<T>(event: string, data: T): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error publishing event ${event}:`, error);
        }
      });
    }
  }
}

export const eventBus = new EventBus();

export const AppEvents = {
  CLIENT_INITIALIZED: 'client_initialized',
  CLIENT_ERROR: 'client_error',
  BOOTSTRAP_STARTED: 'bootstrap_started',
  BOOTSTRAP_COMPLETED: 'bootstrap_completed',
  BOOTSTRAP_FAILED: 'bootstrap_failed',
  CONNECTION_STARTED: 'connection_started',
  CONNECTION_ESTABLISHED: 'connection_established',
  CONNECTION_FAILED: 'connection_failed',
  CONNECTION_RESTORED: 'connection_restored',
  AUTH_INITIALIZED: 'auth_initialized',
  AUTH_ERROR: 'auth_error',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  USER_UPDATED: 'user_updated',
  CONFIG_UPDATED: 'config_updated',
  CONFIG_ERROR: 'config_error',
  SITE_CONFIG_LOADED: 'site_config_loaded',
  APP_MOUNTED: 'app_mounted',
  APP_UNMOUNTED: 'app_unmounted',
  TAB_VISIBLE: 'tab_visible',
  TAB_HIDDEN: 'tab_hidden',
};

