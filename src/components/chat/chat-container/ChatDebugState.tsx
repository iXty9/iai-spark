
import React, { useRef, useCallback, useEffect } from 'react';
import { StateDebugPanel } from '@/components/debug/StateDebugPanel';
import { ChatDebugOverlay } from './ChatDebugOverlay';
import { Message } from '@/types/chat';
import { useDevMode } from '@/store/use-dev-mode';
import { useDebugInfo } from './hooks/useDebugInfo';
import { useTransitionManager } from './hooks/useTransitionManager';
import { useWebhookTracking } from './hooks/useWebhookTracking';
import { useBootstrapInit } from './hooks/useBootstrapInit';

interface ChatDebugStateProps {
  messages: Message[];
  isLoading: boolean;
  hasInteracted: boolean;
  message: string;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  isTransitioning: boolean;
  setIsTransitioning: (value: boolean) => void;
  setHasInteracted: (value: boolean) => void;
}

export const ChatDebugState: React.FC<ChatDebugStateProps> = ({
  messages,
  isLoading,
  hasInteracted,
  message,
  isAuthLoading,
  isAuthenticated,
  isTransitioning,
  setIsTransitioning,
  setHasInteracted
}) => {
  const { isDevMode } = useDevMode();
  const inputContainerRef = useRef<HTMLDivElement | null>(null);

  // Use custom hooks
  const { debugInfo, updateDebugInfo } = useDebugInfo(isDevMode, messages);
  const { lastWebhookCall } = useWebhookTracking(isDevMode);
  
  useTransitionManager({
    isDevMode,
    messages,
    hasInteracted,
    isTransitioning,
    setIsTransitioning,
    setHasInteracted
  });

  useBootstrapInit(isDevMode, isAuthenticated);

  // Update debug info when relevant state changes
  useEffect(() => {
    updateDebugInfo(inputContainerRef);
  }, [messages.length, hasInteracted, isLoading, updateDebugInfo]);

  const setInputContainerRef = useCallback((ref: HTMLDivElement | null) => {
    inputContainerRef.current = ref;
  }, []);

  // Only render when dev mode is explicitly enabled
  if (!isDevMode) return null;

  return (
    <>
      <ChatDebugOverlay debugInfo={debugInfo} />
      <StateDebugPanel
        messages={messages}
        isLoading={isLoading}
        hasInteracted={hasInteracted}
        message={message}
        isAuthLoading={isAuthLoading}
        isAuthenticated={isAuthenticated}
        lastWebhookCall={lastWebhookCall}
      />
    </>
  );
};
