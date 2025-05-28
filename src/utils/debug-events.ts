
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

// Production-optimized no-op function
const createNoOpEmitter = () => () => {};

// Development debug event emitter
const createDevEmitter = () => {
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
        document.addEventListener('visibilitychange', () => {
          this.isTabVisible = document.visibilityState === 'visible';
        });
        this.isTabVisible = document.visibilityState === 'visible';
      }
    },
    
    getEventFingerprint(details: DebugEvent): string {
      const keys = ['lastAction', 'screen', 'lastError'];
      return keys.map(key => details[key as keyof DebugEvent] || '').join('|');
    },
    
    isDuplicate(details: DebugEvent): boolean {
      if (!this.isTabVisible) {
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
  setInterval(() => eventTracker.cleanup(), 60000);

  if (typeof window !== 'undefined') {
    window.addEventListener('devModeChanged', ((e: CustomEvent) => {
      eventTracker.updateDevModeState(e.detail.isDevMode);
    }) as EventListener);
  }

  return (details: DebugEvent): void => {
    if (!eventTracker.isDevModeEnabled) {
      return;
    }
    
    if (!eventTracker.isTabVisible) {
      return;
    }
    
    const eventWithTimestamp = {
      ...details,
      timestamp: new Date().toISOString()
    };
    
    if (eventTracker.isDuplicate(eventWithTimestamp)) {
      return;
    }
    
    const event = new CustomEvent('chatDebug', { 
      detail: eventWithTimestamp 
    });
    window.dispatchEvent(event);
  };
};

// Export the appropriate emitter based on environment
export const emitDebugEvent = process.env.NODE_ENV === 'production' 
  ? createNoOpEmitter() 
  : createDevEmitter();
