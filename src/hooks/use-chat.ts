
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageState } from '@/hooks/chat/use-message-state';
import { useChatApi } from '@/hooks/chat/use-chat-api';
import { useChatWebSocket } from '@/hooks/chat/use-chat-websocket';
import { useChatActions } from '@/hooks/chat/use-chat-actions';
import { Message } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logging';

export const useChat = () => {
  const { user } = useAuth();
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

  const handleError = useCallback((error: string) => {
    const errorMessage: Message = {
      id: uuidv4(),
      content: "I'm sorry, but I encountered an error processing your message. Please try again.",
      sender: 'ai',
      timestamp: new Date().toISOString(),
      metadata: { error: true }
    };
    addMessage(errorMessage);
    setIsLoading(false);
  }, [addMessage, setIsLoading]);

  const { sendMessageToApi } = useChatApi({
    user,
    addMessage,
    onError: handleError
  });

  // Pass messages array to WebSocket hook to prevent duplicate processing
  const { isWebSocketConnected, isWebSocketEnabled } = useChatWebSocket({ 
    addMessage,
    messages // Pass current messages to determine screen state
  });

  const {
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat
  } = useChatActions({
    message,
    setMessage,
    isLoading,
    setIsLoading,
    addMessage,
    clearMessages,
    resetState,
    sendMessageToApi
  });

  return {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat,
    setMessages,
    addMessage,
    isWebSocketConnected,
    isWebSocketEnabled
  };
};
