
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
}

export const emitDebugEvent = (details: DebugEvent) => {
  console.log('DEBUG EVENT:', details);
  const event = new CustomEvent('chatDebug', { 
    detail: details 
  });
  window.dispatchEvent(event);
};
