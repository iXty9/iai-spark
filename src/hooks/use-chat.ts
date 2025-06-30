import { useState, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast"
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logging';
import { Message } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { useChatActions } from './chat/use-chat-actions';
import { useMessageState } from './chat/use-message-state';
import { useChatApi } from './chat/use-chat-api';
import { useChatWebSocket } from './chat/use-chat-websocket';

/**
 * Main chat hook providing unified state management and actions for the chat interface.
 * 
 * This is the single source of truth for all chat-related state and operations.
 * Use this hook in UI components instead of individual specialized hooks.
 * 
 * Features:
 * - Message state management (send, receive, clear)
 * - Request abort and retry capabilities
 * - WebSocket integration
 * - Error handling with user feedback
 * - Chat export/import functionality
 */
export const useChat = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Request tracking for abort functionality
  const activeRequestRef = useRef<{
    startTime: number;
    messageId: string;
    controller?: AbortController;
  } | null>(null);
  
  // Retry state management
  const messageAttemptsRef = useRef<number>(0);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;
  
  // Use the unified message state hook
  const { 
    messages, 
    addMessage, 
    updateMessage,
    clearMessages,
    setMessages,
  } = useMessageState();
  
  const { sendMessageToApi } = useChatApi({ 
    user, 
    addMessage,
    updateMessage, 
    onError: (errorMsg) => setError(errorMsg) 
  });
  
  const { isWebSocketConnected, isWebSocketEnabled } = useChatWebSocket({ addMessage });
  
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

  // Request abort functionality
  const handleAbortRequest = useCallback(() => {
    if (activeRequestRef.current?.controller) {
      activeRequestRef.current.controller.abort();
      setIsLoading(false);
      setIsSubmitting(false);
      
      logger.info('Request aborted by user', null, { module: 'chat' });
      
      window.dispatchEvent(new CustomEvent('aiResponseAborted', { 
        detail: { abortedAt: new Date().toISOString() } 
      }));
      
      activeRequestRef.current = null;
      return true;
    }
    return false;
  }, []);

  // Get current request info for timer display
  const getCurrentRequestInfo = useCallback(() => {
    if (!activeRequestRef.current) return null;
    
    return {
      startTime: activeRequestRef.current.startTime,
      messageId: activeRequestRef.current.messageId,
      elapsedMs: Date.now() - activeRequestRef.current.startTime,
    };
  }, []);

  // Check if there's an active request
  const hasActiveRequest = useCallback(() => {
    return !!activeRequestRef.current;
  }, []);

  // Retry logic
  const handleRetry = useCallback((error: Error) => {
    if (messageAttemptsRef.current < maxRetries && !error.message.includes('abort')) {
      logger.info(`Scheduling retry ${messageAttemptsRef.current}/${maxRetries}`, null, { module: 'chat' });
      
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }

      pendingTimeoutRef.current = setTimeout(() => {
        // Retry the last message
        if (messages.length > 0) {
          const lastUserMessage = [...messages].reverse().find(m => m.sender === 'user');
          if (lastUserMessage) {
            sendMessageInternal(lastUserMessage.content);
          }
        }
      }, Math.pow(2, messageAttemptsRef.current) * 1000);
      
      return true;
    }
    return false;
  }, [messages]);

  const clearRetry = useCallback(() => {
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
    messageAttemptsRef.current = 0;
  }, []);

  // Internal message sending logic
  const sendMessageInternal = useCallback(async (messageContent: string) => {
    if (isSubmitting || !messageContent.trim()) return;

    setIsSubmitting(true);
    setIsLoading(true);
    setError(null);

    const userMessage = createUserMessage(messageContent);
    addMessage(userMessage);

    // Set up request tracking
    const requestStartTime = Date.now();
    const controller = new AbortController();
    activeRequestRef.current = {
      startTime: requestStartTime,
      messageId: userMessage.id,
      controller
    };

    // Dispatch request start event
    window.dispatchEvent(new CustomEvent('aiRequestStart', { 
      detail: { startTime: requestStartTime, messageId: userMessage.id } 
    }));

    try {
      await sendMessageToApi(userMessage);
      
      // Clear retry state on success
      clearRetry();
      
      window.dispatchEvent(new CustomEvent('aiRequestEnd', { 
        detail: { duration: Date.now() - requestStartTime, messageId: userMessage.id } 
      }));
      
    } catch (err: any) {
      logger.error('Error in sendMessage:', err);
      setError(err.message || 'Failed to send message');
      
      // Try retry
      messageAttemptsRef.current++;
      const retryHandled = handleRetry(err);
      
      if (!retryHandled) {
        // Add error message if no retry
        const errorMessage = createErrorMessage(
          "I'm sorry, but I encountered an error processing your message. Please try again."
        );
        addMessage(errorMessage);
        
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: "There was an error sending your message. Please try again.",
        });
        
        clearRetry();
      }
      
      window.dispatchEvent(new CustomEvent('aiRequestError', { 
        detail: { error: err.message, messageId: userMessage.id } 
      }));
      
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
      activeRequestRef.current = null;
    }
  }, [isSubmitting, createUserMessage, addMessage, sendMessageToApi, createErrorMessage, toast, handleRetry, clearRetry]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const clearChat = () => {
    clearMessages();
    clearRetry();
    toast({
      title: "Chat cleared!",
      description: "All messages have been deleted.",
    });
  };

  const startChat = useCallback(async (initialMessage: string) => {
    if (!initialMessage.trim()) return;
    await sendMessageInternal(initialMessage);
  }, [sendMessageInternal]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const messageToSend = input;
    setInput(''); // Clear input immediately
    await sendMessageInternal(messageToSend);
  }, [input, sendMessageInternal]);

  return {
    // Core state
    messages,
    input,
    isLoading,
    isInitialising,
    error,
    
    // Actions
    handleInputChange,
    sendMessage,
    clearChat,
    startChat,
    setMessages,
    addMessage,
    handleExportChat,
    
    // Request management
    handleAbortRequest,
    getCurrentRequestInfo,
    hasActiveRequest,
    
    // Helper functions
    createUserMessage,
    createErrorMessage,
    
    // WebSocket status
    isWebSocketConnected,
    isWebSocketEnabled,
    
    // Aliases for compatibility
    message: input,
    setMessage: setInput,
    handleSubmit: sendMessage,
    handleClearChat: clearChat,
  };
};
