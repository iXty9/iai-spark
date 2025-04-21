
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageState } from './chat/use-message-state';
import { useChatSubmit } from './chat/use-chat-submit';
import { exportChat, sendMessage } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';
import { v4 as uuidv4 } from 'uuid';

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
      
      emitDebugEvent({
        authState: !!user ? 'Authenticated' : 'Not Authenticated',
        lastAction: 'Auth state loaded'
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
    
    emitDebugEvent({
      lastAction: 'Exporting chat'
    });
    
    try {
      exportChat(messages);
      toast.success('Chat exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export chat');
      emitDebugEvent({
        lastError: 'Export failed'
      });
    }
  }, [messages]);

  // Safely start a chat with proper error handling
  const startChat = useCallback(async (initialMessage: string) => {
    if (authLoading) {
      console.warn('Chat start blocked: Auth still loading');
      toast.error("Please wait while we load your profile...");
      emitDebugEvent({
        lastAction: 'Chat start blocked: Auth still loading',
        lastError: 'Auth loading is in progress',
        isLoading: false
      });
      return;
    }
    
    if (transitionInProgress.current) {
      console.warn('Chat start blocked: Transition already in progress');
      emitDebugEvent({
        lastAction: 'Chat start blocked: Transition already in progress',
        isTransitioning: true
      });
      return;
    }
    
    if (!initialMessage.trim()) {
      console.warn('Chat start blocked: Empty message');
      emitDebugEvent({
        lastAction: 'Chat start blocked: Empty message',
        isLoading: false
      });
      return;
    }
    
    console.log("Starting new chat using real webhook:", {
      initialMessage,
      isAuthenticated: !!user,
      timestamp: new Date().toISOString()
    });
    
    emitDebugEvent({
      lastAction: `Starting new chat with: "${initialMessage}" (using real webhook)`,
      isTransitioning: true,
      isLoading: true,
      hasInteracted: true
    });
    
    transitionInProgress.current = true;
    
    try {
      // Create initial user message
      const userMessage = {
        id: uuidv4(),
        content: initialMessage,
        sender: 'user' as const,
        timestamp: new Date()
      };
      
      // Add the user message to the chat
      addMessage(userMessage);
      
      emitDebugEvent({
        lastAction: 'Added initial user message, calling webhook...',
        messagesCount: 1,
        hasInteracted: true
      });
      
      // Use the real webhook integration to get a response
      setIsLoading(true);
      
      try {
        const response = await sendMessage({
          message: initialMessage,
          isAuthenticated: !!user,
          onError: (error) => {
            console.error('Error in welcome screen AI response:', error);
            emitDebugEvent({
              lastError: `Error in welcome screen AI response: ${error.message}`,
              isLoading: false
            });
          }
        });
        
        // Add the real AI response from the webhook
        const aiMessage = {
          id: uuidv4(),
          content: response.content,
          sender: 'ai' as const,
          timestamp: new Date()
        };
        
        addMessage(aiMessage);
        setIsLoading(false);
        transitionInProgress.current = false;
        
        emitDebugEvent({
          lastAction: 'Chat started successfully with real webhook response',
          isLoading: false,
          isTransitioning: false,
          hasInteracted: true,
          screen: 'Chat Screen',
          messagesCount: 2
        });
      } catch (error) {
        console.error('Error in welcome screen webhook call:', error);
        setIsLoading(false);
        
        // If webhook failed, still add an error message to complete the transition
        const errorMessage = {
          id: uuidv4(),
          content: "I'm sorry, but I encountered an error processing your message. Please try again.",
          sender: 'ai' as const,
          timestamp: new Date(),
          metadata: { error: true }
        };
        
        addMessage(errorMessage);
        transitionInProgress.current = false;
        
        emitDebugEvent({
          lastError: error instanceof Error ? `Welcome screen webhook error: ${error.message}` : 'Unknown webhook error',
          isLoading: false,
          isTransitioning: false,
          screen: 'Chat Screen'
        });
      }
    } catch (error) {
      console.error('Error in startChat:', error);
      setIsLoading(false);
      transitionInProgress.current = false;
      
      emitDebugEvent({
        lastError: error instanceof Error ? error.message : 'Unknown error in startChat',
        isLoading: false,
        isTransitioning: false
      });
    }
  }, [user, authLoading, setIsLoading, addMessage]);

  // Clean up logic - ensure we reset flags if component unmounts while loading
  useEffect(() => {
    return () => {
      if (transitionInProgress.current) {
        console.log('Cleaning up transition state on unmount');
        transitionInProgress.current = false;
      }
    };
  }, []);

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
    
    emitDebugEvent({
      messagesCount: messages.length,
      isLoading,
      authState: authLoading ? 'Loading' : !!user ? 'Authenticated' : 'Not Authenticated',
      lastAction: 'Chat state updated'
    });
    
    // Reset transition flag when loading completes
    if (!isLoading && transitionInProgress.current) {
      console.log('Resetting transition flag');
      transitionInProgress.current = false;
      
      emitDebugEvent({
        isTransitioning: false,
        lastAction: 'Loading complete, transition flag reset'
      });
    }
  }, [messages.length, isLoading, authLoading, user]);

  // Wrapped submit handler with error handling
  const wrappedSubmit = useCallback((e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (transitionInProgress.current) {
      console.warn('Submit blocked: Transition in progress');
      emitDebugEvent({
        lastAction: 'Submit blocked: Transition in progress',
        isTransitioning: true
      });
      return;
    }
    
    try {
      console.log('Submitting message:', {
        hasMessage: !!message.trim(),
        isLoading,
        timestamp: new Date().toISOString()
      });
      
      if (!message.trim()) {
        console.warn('Submit prevented: Empty message');
        emitDebugEvent({
          lastAction: 'Submit prevented: Empty message',
          isLoading: false
        });
        return;
      }
      
      emitDebugEvent({
        lastAction: `Submitting message: "${message.trim()}"`,
        isLoading: true,
        inputState: 'Submitting'
      });
      
      handleSubmit(e);
    } catch (error) {
      console.error('Error in submit handler:', error);
      setIsLoading(false);
      transitionInProgress.current = false;
      toast.error('An error occurred while sending your message');
      
      emitDebugEvent({
        lastError: error instanceof Error ? error.message : 'Unknown error in submit handler',
        isLoading: false,
        isTransitioning: false,
        inputState: 'Error'
      });
    }
  }, [handleSubmit, setIsLoading, message, isLoading]);

  // Clean up on errors or when transitioning state gets stuck
  useEffect(() => {
    // Check for stuck states and reset
    const checkStuckState = setTimeout(() => {
      if (isLoading && messages.length === 0) {
        console.warn('Detected stuck loading state, resetting');
        setIsLoading(false);
        transitionInProgress.current = false;
        
        emitDebugEvent({
          lastAction: 'Force reset stuck loading state',
          isLoading: false,
          isTransitioning: false
        });
      }
    }, 10000);
    
    return () => clearTimeout(checkStuckState);
  }, [isLoading, messages.length, setIsLoading]);

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
