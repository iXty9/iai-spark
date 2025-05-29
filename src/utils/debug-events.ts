
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

// Production-optimized no-op function that gets tree-shaken
const createNoOpEmitter = (): ((details: DebugEvent) => void) => {
  if (process.env.NODE_ENV === 'production') {
    return () => {}; // No-op in production
  }
  return () => {}; // Fallback no-op
};

// Development debug event emitter with optimizations
const createDevEmitter = () => {
  // Early production check with compile-time optimization
  if (process.env.NODE_ENV === 'production') {
    return () => {}; // Tree-shakeable no-op
  }

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
    const devModeHandler = (e: CustomEvent) => {
      eventTracker.updateDevModeState(e.detail.isDevMode);
    };
    
    const unloadHandler = () => {
      clearInterval(cleanupInterval);
    };
    
    window.addEventListener('devModeChanged', devModeHandler as EventListener);
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
    
    // Use requestIdleCallback for non-critical debug events
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const event = new CustomEvent('chatDebug', { 
          detail: eventWithTimestamp 
        });
        window.dispatchEvent(event);
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      const event = new CustomEvent('chatDebug', { 
        detail: eventWithTimestamp 
      });
      window.dispatchEvent(event);
    }
  };
};

// Export with compile-time optimization
export const emitDebugEvent = process.env.NODE_ENV === 'production' 
  ? createNoOpEmitter() 
  : createDevEmitter();
