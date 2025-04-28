
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageState } from './chat/use-message-state';
import { useChatSubmit } from './chat/use-chat-submit';
import { useChatState } from './chat/use-chat-state';
import { useChatInit } from './chat/use-chat-init';
import { useChatActions } from './chat/use-chat-actions';

export const useChat = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  
  const {
    messages,
    message,
    isLoading,
    setMessage,
    setIsLoading,
    addMessage,
    clearMessages,
    setMessages,
    resetState
  } = useMessageState();

  const {
    isTransitioning,
    hasLoadedAuth,
    handleTransitionStart,
    handleTransitionEnd,
    handleAuthLoaded
  } = useChatState();

  const { handleSubmit } = useChatSubmit(
    message,
    setMessage,
    addMessage,
    setIsLoading,
    !!user,
    authLoading
  );

  const { startChat } = useChatInit({
    user,
    authLoading,
    addMessage,
    setIsLoading,
    handleTransitionStart
  });

  const { handleExportChat } = useChatActions(messages);

  return {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat: clearMessages,
    handleExportChat,
    startChat,
    authError
  };
};
