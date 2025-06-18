
import { logger } from './logging';
import { CONFIG_CONSTANTS } from './constants';

interface DebugEvent {
  screen?: string;
  messagesCount?: number;
  isLoading?: boolean;
  hasInteracted?: boolean;
  isTransitioning?: boolean;
  lastAction?: string;
  lastError?: string | null;
  inputState?: string;
  authState?: string;
  timestamp?: string;
}

// Development debug event emitter
const createDebugEmitter = () => {
  const eventTracker = {
    lastEvents: new Map<string, { timestamp: number; details: string }>(),
    minInterval: CONFIG_CONSTANTS.LOG_THROTTLE_MS * 3, // 15 seconds for debug events
    isDevModeEnabled: false,
    isTabVisible: true,

    updateDevModeState(isEnabled: boolean) {
      this.isDevModeEnabled = isEnabled;
    },
    
    init() {
      if (typeof document !== 'undefined') {
        const visibilityHandler = () => {
          this.isTabVisible = document.visibilityState === 'visible';
        };
        document.addEventListener('visibilitychange', visibilityHandler, { passive: true });
        this.isTabVisible = document.visibilityState === 'visible';
      }
    },
    
    getEventFingerprint(details: DebugEvent): string {
      const keys = ['lastAction', 'screen', 'lastError'];
      return keys.map(key => details[key as keyof DebugEvent] || '').join('|');
    },
    
    isDuplicate(details: DebugEvent): boolean {
      if (!this.isTabVisible || !this.isDevModeEnabled) {
        return true;
      }
      
      const fingerprint = this.getEventFingerprint(details);
      
      if (details.lastError) return false;
      if (!fingerprint.trim()) return false;
      
      const lastRecord = this.lastEvents.get(fingerprint);
      
      if (lastRecord) {
        const timeSince = Date.now() - lastRecord.timestamp;
        if (timeSince < this.minInterval) {
          return true;
        }
      }
      
      this.lastEvents.set(fingerprint, {
        timestamp: Date.now(),
        details: JSON.stringify(details)
      });
      
      return false;
    },
    
    cleanup(): void {
      const cutoff = Date.now() - 60000;
      this.lastEvents.forEach((value, key) => {
        if (value.timestamp < cutoff) {
          this.lastEvents.delete(key);
        }
      });
    }
  };

  eventTracker.init();
  
  const cleanupInterval = setInterval(() => eventTracker.cleanup(), CONFIG_CONSTANTS.LOG_THROTTLE_MS * 24);
  
  if (typeof window !== 'undefined') {
    const devModeHandler = (e: Event) => {
      const customEvent = e as CustomEvent;
      eventTracker.updateDevModeState(customEvent.detail.isDevMode);
    };
    
    const unloadHandler = () => {
      clearInterval(cleanupInterval);
    };
    
    window.addEventListener('devModeChanged', devModeHandler);
    window.addEventListener('beforeunload', unloadHandler);
  }

  return (details: DebugEvent): void => {
    if (!eventTracker.isDevModeEnabled || !eventTracker.isTabVisible) {
      return;
    }
    
    const eventWithTimestamp = {
      ...details,
      timestamp: new Date().toISOString()
    };
    
    if (eventTracker.isDuplicate(eventWithTimestamp)) {
      return;
    }
    
    if (typeof window === 'undefined') {
      return;
    }
    
    const dispatchEvent = (event: CustomEvent) => {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        try {
          window.dispatchEvent(event);
        } catch (error) {
          logger.warn('Failed to dispatch debug event', error, { module: 'debug-events' });
        }
      }
    };
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const event = new CustomEvent('chatDebug', { 
          detail: eventWithTimestamp 
        });
        dispatchEvent(event);
      });
    } else {
      const event = new CustomEvent('chatDebug', { 
        detail: eventWithTimestamp 
      });
      dispatchEvent(event);
    }
  };
};

export const emitDebugEvent = createDebugEmitter();
