
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageState } from './chat/use-message-state';
import { useChatSubmit } from './chat/use-chat-submit';
import { useChatInit } from './chat/use-chat-init';
import { useChatActions } from './chat/use-chat-actions';
import { useChatAbort } from './chat/use-chat-abort';

export const useChat = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  
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

  const { handleSubmit, handleAbortRequest } = useChatSubmit({
    message,
    setMessage,
    addMessage,
    setIsLoading,
    isAuthenticated: !!user,
    isAuthLoading: authLoading,
    userProfile: profile
  });

  const { startChat } = useChatInit({
    user,
    authLoading,
    addMessage,
    setIsLoading,
    handleTransitionStart: () => {} // Simplified - no longer needed
  });

  const { handleExportChat } = useChatActions(messages);
  
  const { 
    getCurrentRequestInfo, 
    hasActiveRequest 
  } = useChatAbort();

  return {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat: clearMessages,
    handleExportChat,
    startChat,
    setMessages,
    handleAbortRequest,
    getCurrentRequestInfo,
    hasActiveRequest
  };
};
