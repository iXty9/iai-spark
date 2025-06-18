
/**
 * Centralized event management service
 * Manages all global event listeners with proper cleanup and type safety
 */

import { logger } from '@/utils/logging';

export type EventCallback<T = any> = (event: T) => void;

interface EventListenerEntry {
  element: EventTarget;
  event: string;
  callback: EventListener;
  options?: AddEventListenerOptions;
}

class EventManagerService {
  private listeners = new Map<string, EventListenerEntry>();
  private customEventCallbacks = new Map<string, Set<EventCallback>>();

  /**
   * Add a global event listener with automatic cleanup tracking
   */
  addGlobalListener<K extends keyof WindowEventMap>(
    event: K,
    callback: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const id = this.generateId();
    const wrappedCallback = (e: Event) => {
      try {
        callback(e as WindowEventMap[K]);
      } catch (error) {
        logger.warn(`Error in ${event} event listener`, error, { module: 'event-manager' });
      }
    };

    window.addEventListener(event, wrappedCallback, options);
    
    this.listeners.set(id, {
      element: window,
      event,
      callback: wrappedCallback,
      options
    });

    return id;
  }

  /**
   * Add a document event listener with automatic cleanup tracking
   */
  addDocumentListener<K extends keyof DocumentEventMap>(
    event: K,
    callback: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): string {
    if (typeof document === 'undefined') {
      return '';
    }

    const id = this.generateId();
    const wrappedCallback = (e: Event) => {
      try {
        callback(e as DocumentEventMap[K]);
      } catch (error) {
        logger.warn(`Error in ${event} document listener`, error, { module: 'event-manager' });
      }
    };

    document.addEventListener(event, wrappedCallback, options);
    
    this.listeners.set(id, {
      element: document,
      event,
      callback: wrappedCallback,
      options
    });

    return id;
  }

  /**
   * Add a custom event listener
   */
  addCustomEventListener(
    eventName: string,
    callback: EventCallback,
    target: EventTarget = window
  ): string {
    const id = this.generateId();
    const wrappedCallback = (e: Event) => {
      try {
        callback(e);
      } catch (error) {
        logger.warn(`Error in custom event ${eventName}`, error, { module: 'event-manager' });
      }
    };

    target.addEventListener(eventName, wrappedCallback);
    
    this.listeners.set(id, {
      element: target,
      event: eventName,
      callback: wrappedCallback
    });

    // Also track for custom event dispatching
    if (!this.customEventCallbacks.has(eventName)) {
      this.customEventCallbacks.set(eventName, new Set());
    }
    this.customEventCallbacks.get(eventName)!.add(callback);

    return id;
  }

  /**
   * Remove a specific event listener
   */
  removeListener(id: string): boolean {
    const entry = this.listeners.get(id);
    if (!entry) {
      return false;
    }

    entry.element.removeEventListener(entry.event, entry.callback, entry.options);
    this.listeners.delete(id);

    // Clean up custom event tracking
    const callbacks = this.customEventCallbacks.get(entry.event);
    if (callbacks) {
      // Note: We can't directly remove the callback since it's wrapped
      // This is a limitation, but acceptable for our use case
      if (callbacks.size === 0) {
        this.customEventCallbacks.delete(entry.event);
      }
    }

    return true;
  }

  /**
   * Dispatch a custom event safely
   */
  dispatchCustomEvent(eventName: string, detail?: any, target: EventTarget = window): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const event = new CustomEvent(eventName, { detail });
      target.dispatchEvent(event);
      return true;
    } catch (error) {
      logger.warn(`Failed to dispatch custom event ${eventName}`, error, { module: 'event-manager' });
      return false;
    }
  }

  /**
   * Remove all event listeners (cleanup)
   */
  removeAllListeners(): void {
    this.listeners.forEach((entry, id) => {
      entry.element.removeEventListener(entry.event, entry.callback, entry.options);
    });
    
    this.listeners.clear();
    this.customEventCallbacks.clear();
    
    logger.info('All event listeners removed', null, { module: 'event-manager' });
  }

  /**
   * Get count of active listeners (for debugging)
   */
  getListenerCount(): number {
    return this.listeners.size;
  }

  private generateId(): string {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  destroy() {
    this.removeAllListeners();
  }
}

export const eventManagerService = new EventManagerService();
