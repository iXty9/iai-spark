
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
  
  const {
    messages,
    message,
    isLoading,
    setMessage,
    setIsLoading,
    addMessage,
    clearMessages,
    setMessages
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
    
    console.log("Starting new chat:", {
      initialMessage,
      isAuthenticated: !!user,
      timestamp: new Date().toISOString()
    });
    
    setMessage(initialMessage);
    // Use setTimeout to avoid state update conflicts
    setTimeout(() => {
      handleSubmit();
    }, 0);
  }, [user, authLoading, setMessage, handleSubmit]);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('Chat state updated:', {
      messageCount: messages.length,
      isLoading,
      authLoading,
      hasLoadedAuth: hasLoadedAuth.current,
      isAuthenticated: !!user,
      timestamp: new Date().toISOString()
    });
  }, [messages.length, isLoading, authLoading, user]);

  // Wrapped submit handler with error handling
  const wrappedSubmit = useCallback((e?: React.FormEvent) => {
    try {
      handleSubmit(e);
    } catch (error) {
      console.error('Error in submit handler:', error);
      setIsLoading(false);
      toast.error('An error occurred while sending your message');
    }
  }, [handleSubmit, setIsLoading]);

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
