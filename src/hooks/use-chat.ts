
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageState } from './chat/use-message-state';
import { useChatSubmit } from './chat/use-chat-submit';
import { exportChat } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';

export const useChat = () => {
  const { user, isLoading: authLoading } = useAuth();
  const hasLoadedAuth = useRef(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const transitionInProgress = useRef(false);
  
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

  // Make sure user state is properly passed to useChatSubmit
  const { handleSubmit } = useChatSubmit(
    message,
    setMessage,
    addMessage,
    setIsLoading,
    !!user,
    authLoading
  );

  // Ensure we track auth state properly
  useEffect(() => {
    if (!authLoading) {
      hasLoadedAuth.current = true;
      console.log('Chat auth state loaded:', {
        isAuthenticated: !!user,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, authLoading]);

  const handleExportChat = useCallback(() => {
    if (messages.length === 0) {
      console.warn('Export attempted with no messages');
      toast.error('No messages to export');
      return;
    }
    
    console.log('Exporting chat:', {
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    });
    
    try {
      exportChat(messages);
      toast.success('Chat exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export chat');
    }
  }, [messages]);

  // Safely start a chat with proper error handling
  const startChat = useCallback((initialMessage: string) => {
    if (authLoading) {
      console.warn('Chat start blocked: Auth still loading');
      toast.error("Please wait while we load your profile...");
      return;
    }
    
    if (transitionInProgress.current) {
      console.warn('Chat start blocked: Transition already in progress');
      return;
    }
    
    console.log("Starting new chat:", {
      initialMessage,
      isAuthenticated: !!user,
      timestamp: new Date().toISOString()
    });
    
    transitionInProgress.current = true;
    setMessage(initialMessage);
    
    // Use setTimeout to avoid state update conflicts
    setTimeout(() => {
      try {
        wrappedSubmit();
      } catch (error) {
        console.error('Error in startChat:', error);
        setIsLoading(false);
        transitionInProgress.current = false;
        toast.error('Failed to start chat. Please try again.');
      }
    }, 0);
  }, [user, authLoading, setMessage, setIsLoading]);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('Chat state updated:', {
      messageCount: messages.length,
      isLoading,
      authLoading,
      hasLoadedAuth: hasLoadedAuth.current,
      isAuthenticated: !!user,
      transitionInProgress: transitionInProgress.current,
      timestamp: new Date().toISOString()
    });
    
    // Reset transition flag when loading completes
    if (!isLoading && transitionInProgress.current) {
      console.log('Resetting transition flag');
      transitionInProgress.current = false;
    }
  }, [messages.length, isLoading, authLoading, user]);

  // Wrapped submit handler with error handling
  const wrappedSubmit = useCallback((e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    try {
      console.log('Submitting message:', {
        hasMessage: !!message.trim(),
        isLoading,
        timestamp: new Date().toISOString()
      });
      
      handleSubmit(e);
    } catch (error) {
      console.error('Error in submit handler:', error);
      setIsLoading(false);
      transitionInProgress.current = false;
      toast.error('An error occurred while sending your message');
    }
  }, [handleSubmit, setIsLoading, message, isLoading]);

  return {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit: wrappedSubmit,
    handleClearChat: clearMessages,
    handleExportChat,
    startChat,
    authError
  };
};
