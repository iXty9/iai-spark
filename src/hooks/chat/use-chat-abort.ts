
import { useEffect, useRef, useCallback } from 'react';

export const useChatAbort = () => {
  // Reference to track if there's an active request
  const activeRequestRef = useRef<{
    startTime: number;
    messageId: string;
    timeoutId?: NodeJS.Timeout;
  } | null>(null);

  // Function to call when a request starts
  const onRequestStart = useCallback((startTime: number, messageId: string) => {
    activeRequestRef.current = {
      startTime,
      messageId
    };
  }, []);

  // Function to call when a request ends
  const onRequestEnd = useCallback(() => {
    activeRequestRef.current = null;
  }, []);

  // Setup event listeners for AI request lifecycle
  useEffect(() => {
    const handleRequestStart = (e: CustomEvent) => {
      const { startTime, messageId } = e.detail;
      onRequestStart(startTime, messageId);
    };

    const handleRequestEnd = () => {
      onRequestEnd();
    };

    // Add event listeners
    window.addEventListener('aiRequestStart', handleRequestStart as EventListener);
    window.addEventListener('aiRequestEnd', handleRequestEnd);
    window.addEventListener('aiRequestError', handleRequestEnd);
    window.addEventListener('aiResponseAborted', handleRequestEnd);

    return () => {
      // Remove event listeners on cleanup
      window.removeEventListener('aiRequestStart', handleRequestStart as EventListener);
      window.removeEventListener('aiRequestEnd', handleRequestEnd);
      window.removeEventListener('aiRequestError', handleRequestEnd);
      window.removeEventListener('aiResponseAborted', handleRequestEnd);
    };
  }, [onRequestStart, onRequestEnd]);

  // Get current request info for the timer
  const getCurrentRequestInfo = useCallback(() => {
    if (!activeRequestRef.current) return null;
    
    return {
      startTime: activeRequestRef.current.startTime,
      messageId: activeRequestRef.current.messageId,
      elapsedMs: Date.now() - activeRequestRef.current.startTime,
    };
  }, []);

  // Check if a request is active
  const hasActiveRequest = useCallback(() => {
    return !!activeRequestRef.current;
  }, []);

  return {
    onRequestStart,
    onRequestEnd,
    getCurrentRequestInfo,
    hasActiveRequest
  };
};
