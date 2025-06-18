
import { logger } from './logging';
import { CONFIG_CONSTANTS } from './constants';
import { eventManagerService } from '@/services/global/event-manager-service';
import { timerManagerService } from '@/services/global/timer-manager-service';
import { domManagerService } from '@/services/global/dom-manager-service';

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
    cleanupTimerId: null as string | null,
    devModeListenerId: null as string | null,
    visibilityListenerId: null as string | null,

    updateDevModeState(isEnabled: boolean) {
      this.isDevModeEnabled = isEnabled;
    },
    
    init() {
      // Use the new event manager service
      this.visibilityListenerId = eventManagerService.addDocumentListener('visibilitychange', () => {
        this.isTabVisible = document.visibilityState === 'visible';
      }, { passive: true });

      this.isTabVisible = typeof document !== 'undefined' ? 
        document.visibilityState === 'visible' : true;

      // Set up cleanup timer using timer manager service
      this.cleanupTimerId = timerManagerService.setInterval(() => this.cleanup(), CONFIG_CONSTANTS.LOG_THROTTLE_MS * 24);

      // Listen for dev mode changes
      this.devModeListenerId = eventManagerService.addCustomEventListener('devModeChanged', (e: CustomEvent) => {
        this.updateDevModeState(e.detail.isDevMode);
      });
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
    },

    destroy() {
      if (this.cleanupTimerId) {
        timerManagerService.clearTimer(this.cleanupTimerId);
        this.cleanupTimerId = null;
      }
      if (this.devModeListenerId) {
        eventManagerService.removeListener(this.devModeListenerId);
        this.devModeListenerId = null;
      }
      if (this.visibilityListenerId) {
        eventManagerService.removeListener(this.visibilityListenerId);
        this.visibilityListenerId = null;
      }
      this.lastEvents.clear();
    }
  };

  eventTracker.init();

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
    
    const dispatchEvent = () => {
      eventManagerService.dispatchCustomEvent('chatDebug', eventWithTimestamp);
    };
    
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(dispatchEvent);
    } else {
      dispatchEvent();
    }
  };
};

export const emitDebugEvent = createDebugEmitter();

// Cleanup function for proper teardown
export const cleanupDebugEvents = () => {
  if (emitDebugEvent && typeof (emitDebugEvent as any).destroy === 'function') {
    (emitDebugEvent as any).destroy();
  }
};
