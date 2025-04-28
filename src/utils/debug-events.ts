
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

// Track event count to limit console output
const eventCounts: Record<string, number> = {};
const MAX_EVENTS_PER_TYPE = 5;
const RESET_INTERVAL = 10000; // 10 seconds
let lastConsoleLogTime = Date.now();

// Throttle console logs
const throttledConsoleLog = (message: string, data: any) => {
  const currentTime = Date.now();
  
  // Only log if at least 1 second has passed since last log
  if (currentTime - lastConsoleLogTime > 1000) {
    console.log(message, data);
    lastConsoleLogTime = currentTime;
  }
};

// Reset event counts periodically
setInterval(() => {
  for (const key in eventCounts) {
    eventCounts[key] = 0;
  }
}, RESET_INTERVAL);

export const emitDebugEvent = (details: DebugEvent) => {
  // Add timestamp to all events
  const eventWithTimestamp = {
    ...details,
    timestamp: new Date().toISOString()
  };
  
  // Determine event type based on lastAction or screen
  const eventType = details.lastAction || details.screen || 'general';
  
  // Check if we've seen too many of this event type recently
  eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
  
  // Only log if we haven't seen too many of this event or if it's an error
  if (details.lastError || eventCounts[eventType] <= MAX_EVENTS_PER_TYPE) {
    throttledConsoleLog('DEBUG EVENT:', eventWithTimestamp);
  }
  
  // Always dispatch the event to the DOM (for debugging tools)
  const event = new CustomEvent('chatDebug', { 
    detail: eventWithTimestamp 
  });
  window.dispatchEvent(event);
};
