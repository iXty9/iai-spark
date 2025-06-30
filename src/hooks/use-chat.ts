
import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast"
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';
import { Message } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { useChatActions } from './chat/use-chat-actions';
import { useMessageState } from './chat/use-message-state';
import { useChatApi } from './chat/use-chat-api';
import { useChatWebSocket } from './chat/use-chat-websocket';

export const useChat = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use the unified message state hook (useMessageState)
  const { 
    messages, 
    message,
    setMessage: setMessageState,
    setIsLoading: setMessageStateLoading,
    addMessage, 
    clearMessages,
    setMessages,
    resetState
  } = useMessageState();
  
  const { sendMessageToApi } = useChatApi({ 
    user, 
    addMessage, 
    onError: (errorMsg) => setError(errorMsg) 
  });
  
  const { isWebSocketConnected, isWebSocketEnabled } = useChatWebSocket({ addMessage });
  
  // Use the chat actions hook to get the real export functionality
  const { handleExportChat } = useChatActions(messages);

  // Helper functions to create messages
  const createUserMessage = useCallback((content: string): Message => {
    return {
      id: uuidv4(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };
  }, []);

  const createErrorMessage = useCallback((content: string): Message => {
    return {
      id: uuidv4(),
      content,
      sender: 'ai',
      timestamp: new Date().toISOString(),
      metadata: { isError: true }
    };
  }, []);

  // Set initializing to false after first render
  useState(() => {
    setIsInitialising(false);
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const clearChat = () => {
    clearMessages();
    toast({
      title: "Chat cleared!",
      description: "All messages have been deleted.",
    })
  };

  const startChat = useCallback(async (initialMessage: string) => {
    if (!initialMessage.trim()) return;

    setIsLoading(true);
    setMessageStateLoading(true);
    setError(null);

    const userMessage = createUserMessage(initialMessage);
    addMessage(userMessage);

    try {
      await sendMessageToApi(userMessage);
    } catch (err: any) {
      logger.error('Error in startChat:', err);
      setError(err.message || 'Failed to start chat');
      
      // Add error message to chat
      const errorMessage = createErrorMessage("I'm sorry, but I encountered an error processing your message. Please try again.");
      addMessage(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was an error starting the chat. Please try again.",
      })
    } finally {
      setIsLoading(false);
      setMessageStateLoading(false);
    }
  }, [createUserMessage, addMessage, sendMessageToApi, createErrorMessage, toast, setMessageStateLoading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setMessageStateLoading(true);
    setError(null);

    const userMessage = createUserMessage(input);
    addMessage(userMessage);
    setInput('');

    try {
      await sendMessageToApi(userMessage);
    } catch (err: any) {
      logger.error('Error in sendMessage:', err);
      setError(err.message || 'Failed to send message');
      
      // Add error message to chat
      const errorMessage = createErrorMessage("I'm sorry, but I encountered an error processing your message. Please try again.");
      addMessage(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was an error sending your message. Please try again.",
      })
    } finally {
      setIsLoading(false);
      setMessageStateLoading(false);
    }
  };

  return {
    messages,
    input,
    message: input, // alias for compatibility
    isLoading,
    isInitialising,
    error,
    handleInputChange,
    setMessage: setInput, // alias for compatibility
    handleSubmit: sendMessage, // alias for compatibility
    sendMessage,
    clearChat,
    handleClearChat: clearChat, // alias for compatibility
    handleExportChat, // Now using the real export functionality from useChatActions
    startChat, // Now properly implemented
    setMessages,
    addMessage,
    createUserMessage,
    createErrorMessage,
    isWebSocketConnected,
    isWebSocketEnabled,
    handleAbortRequest: () => {}, // placeholder
    getCurrentRequestInfo: () => null, // placeholder
    hasActiveRequest: () => false, // placeholder
  };
};
