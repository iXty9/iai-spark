
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

// Improved event tracking with frequency limiting
const eventTracker = {
  // Use a map to store last event by type
  lastEvents: new Map<string, { timestamp: number; details: string }>(),
  
  // Minimum time between similar events (in ms)
  minInterval: 5000,
  
  // Check if DevMode is enabled globally
  // We'll use this for conditional execution
  isDevModeEnabled: false,

  // For updating the dev mode state
  updateDevModeState(isEnabled: boolean) {
    this.isDevModeEnabled = isEnabled;
  },
  
  // Get a fingerprint for an event to identify similar events
  getEventFingerprint(details: DebugEvent): string {
    // Create a unique signature for this event type
    const keys = ['lastAction', 'screen', 'lastError'];
    return keys.map(key => details[key as keyof DebugEvent] || '').join('|');
  },
  
  // Check if an event is too similar to a recent one
  isDuplicate(details: DebugEvent): boolean {
    const fingerprint = this.getEventFingerprint(details);
    
    // Always allow error events through
    if (details.lastError) return false;
    
    // Skip checking for empty fingerprints
    if (!fingerprint.trim()) return false;
    
    const lastRecord = this.lastEvents.get(fingerprint);
    
    if (lastRecord) {
      const timeSince = Date.now() - lastRecord.timestamp;
      
      // If event is too recent, consider it a duplicate
      if (timeSince < this.minInterval) {
        return true;
      }
    }
    
    // Record this event
    this.lastEvents.set(fingerprint, {
      timestamp: Date.now(),
      details: JSON.stringify(details)
    });
    
    return false;
  },
  
  // Clean up old events (call periodically)
  cleanup(): void {
    const cutoff = Date.now() - 60000; // 1 minute ago
    
    this.lastEvents.forEach((value, key) => {
      if (value.timestamp < cutoff) {
        this.lastEvents.delete(key);
      }
    });
  }
};

// Clean up old events every minute
setInterval(() => eventTracker.cleanup(), 60000);

// Listen for dev mode changes
if (typeof window !== 'undefined') {
  window.addEventListener('devModeChanged', ((e: CustomEvent) => {
    eventTracker.updateDevModeState(e.detail.isDevMode);
  }) as EventListener);
}

export const emitDebugEvent = (details: DebugEvent): void => {
  // Only emit events if in development or DevMode is enabled
  if (process.env.NODE_ENV !== 'development' && !eventTracker.isDevModeEnabled) {
    return;
  }
  
  // Add timestamp to all events
  const eventWithTimestamp = {
    ...details,
    timestamp: new Date().toISOString()
  };
  
  // Check if this is a duplicate event
  if (eventTracker.isDuplicate(eventWithTimestamp)) {
    return;
  }
  
  // Dispatch the event to the DOM (for debugging tools)
  const event = new CustomEvent('chatDebug', { 
    detail: eventWithTimestamp 
  });
  window.dispatchEvent(event);
};
