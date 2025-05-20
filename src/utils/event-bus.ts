
/**
 * Core event bus for application-wide state coordination
 * Provides a centralized way to dispatch and subscribe to events
 */

type EventCallback<T = any> = (payload?: T) => void;

interface EventSubscription {
  unsubscribe: () => void;
}

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();
  
  /**
   * Subscribe to an event
   * @param eventName Name of the event to subscribe to
   * @param callback Function to call when event is triggered
   * @returns Subscription object with unsubscribe method
   */
  subscribe<T = any>(eventName: string, callback: EventCallback<T>): EventSubscription {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    
    this.events.get(eventName)?.add(callback);
    
    return {
      unsubscribe: () => {
        const callbacks = this.events.get(eventName);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            this.events.delete(eventName);
          }
        }
      }
    };
  }
  
  /**
   * Publish an event with optional payload
   * @param eventName Name of the event to publish
   * @param payload Optional data to send with the event
   */
  publish<T = any>(eventName: string, payload?: T): void {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }
  
  /**
   * Check if an event has subscribers
   * @param eventName Name of the event to check
   * @returns True if the event has subscribers
   */
  hasSubscribers(eventName: string): boolean {
    return this.events.has(eventName) && (this.events.get(eventName)?.size ?? 0) > 0;
  }
  
  /**
   * Clear all subscribers for an event
   * @param eventName Name of the event to clear
   */
  clear(eventName: string): void {
    this.events.delete(eventName);
  }
  
  /**
   * Clear all subscribers for all events
   */
  clearAll(): void {
    this.events.clear();
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Event names as constants to prevent typos
export const AppEvents = {
  // Client state events
  CLIENT_INITIALIZED: 'client:initialized',
  CLIENT_ERROR: 'client:error',
  
  // Bootstrap events
  BOOTSTRAP_STARTED: 'bootstrap:started',
  BOOTSTRAP_COMPLETED: 'bootstrap:completed',
  BOOTSTRAP_FAILED: 'bootstrap:failed',
  
  // Connection events
  CONNECTION_STARTED: 'connection:started',
  CONNECTION_ESTABLISHED: 'connection:established',
  CONNECTION_FAILED: 'connection:failed',
  CONNECTION_LOST: 'connection:lost',
  
  // Auth events
  AUTH_INITIALIZED: 'auth:initialized',
  AUTH_STATE_CHANGED: 'auth:state_changed',
  AUTH_ERROR: 'auth:error',
  
  // Visibility events
  TAB_VISIBLE: 'tab:visible',
  TAB_HIDDEN: 'tab:hidden',

  // Debug events
  DEBUG_EVENT: 'debug:event',
  
  // Lifecycle events
  APP_MOUNTED: 'app:mounted',
  APP_UNMOUNTED: 'app:unmounted',
};
