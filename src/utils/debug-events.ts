
import { useDevMode } from '@/store/use-dev-mode';

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

// Development debug event emitter - now works in all environments when dev mode is enabled
const createDebugEmitter = () => {
  const eventTracker = {
    lastEvents: new Map<string, { timestamp: number; details: string }>(),
    minInterval: 15000,
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
  
  // Use a less frequent cleanup interval
  const cleanupInterval = setInterval(() => eventTracker.cleanup(), 120000);
  
  // Cleanup on page unload
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
    // Fast early returns for performance
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
    
    // Ensure window exists before dispatching events
    if (typeof window === 'undefined') {
      return;
    }
    
    const dispatchEvent = (event: CustomEvent) => {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(event);
      }
    };
    
    // Use requestIdleCallback for non-critical debug events
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const event = new CustomEvent('chatDebug', { 
          detail: eventWithTimestamp 
        });
        dispatchEvent(event);
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      const event = new CustomEvent('chatDebug', { 
        detail: eventWithTimestamp 
      });
      dispatchEvent(event);
    }
  };
};

// Export debug event emitter that works in all environments
export const emitDebugEvent = createDebugEmitter();
