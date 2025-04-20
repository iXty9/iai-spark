
import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageState } from './chat/use-message-state';
import { useChatSubmit } from './chat/use-chat-submit';
import { exportChat } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';

export const useChat = () => {
  const { user, isLoading: authLoading } = useAuth();
  const hasLoadedAuth = useRef(false);
  
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

  const { handleSubmit } = useChatSubmit(
    message,
    setMessage,
    addMessage,
    setIsLoading,
    !!user,
    authLoading
  );

  useEffect(() => {
    if (!authLoading && !hasLoadedAuth.current) {
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
    
    exportChat(messages);
    toast.success('Chat exported successfully');
  }, [messages]);

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
    handleSubmit();
  }, [user, authLoading, setMessage, handleSubmit]);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('Chat state updated:', {
      messageCount: messages.length,
      isLoading,
      authLoading,
      hasLoadedAuth: hasLoadedAuth.current,
      timestamp: new Date().toISOString()
    });
  }, [messages.length, isLoading, authLoading]);

  return {
    messages,
    message,
    isLoading,
    setMessage,
    handleSubmit,
    handleClearChat: clearMessages,
    handleExportChat,
    startChat
  };
};
