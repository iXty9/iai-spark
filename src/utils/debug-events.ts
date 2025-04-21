
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
  timestamp?: string; // Add timestamp
}

export const emitDebugEvent = (details: DebugEvent) => {
  // Add timestamp to all events
  const eventWithTimestamp = {
    ...details,
    timestamp: new Date().toISOString()
  };
  
  console.log('DEBUG EVENT:', eventWithTimestamp);
  const event = new CustomEvent('chatDebug', { 
    detail: eventWithTimestamp 
  });
  window.dispatchEvent(event);
};
