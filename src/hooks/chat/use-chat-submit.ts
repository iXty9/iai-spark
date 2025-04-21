
import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { sendMessage } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';

export const useChatSubmit = (
  message: string,
  setMessage: (msg: string) => void,
  addMessage: (msg: Message) => void,
  setIsLoading: (loading: boolean) => void,
  isAuthenticated: boolean,
  isAuthLoading: boolean
) => {
  const messageAttempts = useRef<number>(0);
  const maxRetries = 3;
  const pendingTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Clear any pending timeouts to prevent multiple submissions
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current);
      pendingTimeout.current = null;
    }

    if (!message.trim()) {
      console.warn('Submit attempted with empty message');
      emitDebugEvent({
        lastAction: 'Submit prevented: Empty message',
        isLoading: false
      });
      return;
    }
    
    // Early return for auth loading with proper state reset
    if (isAuthLoading) {
      console.warn('Message submission blocked: Auth still loading');
      toast.error("Please wait while we load your profile...");
      setIsLoading(false);
      emitDebugEvent({
        lastAction: 'Message submission blocked: Auth still loading',
        lastError: 'Auth loading in progress',
        isLoading: false,
        inputState: 'Ready'
      });
      return;
    }

    // Emit event before we start processing
    emitDebugEvent({
      lastAction: 'Message submission starting',
      isLoading: true,
      inputState: 'Sending'
    });

    // Create user message regardless of auth state
    const userMessage: Message = {
      id: uuidv4(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    console.log('New message created:', {
      messageId: userMessage.id,
      timestamp: userMessage.timestamp.toISOString(),
      contentLength: message.length,
      isAuthenticated: isAuthenticated
    });
    
    emitDebugEvent({
      lastAction: `User message created (ID: ${userMessage.id.substring(0, 8)}...)`,
      isLoading: true
    });
    
    addMessage(userMessage);
    setMessage('');
    setIsLoading(true);
    messageAttempts.current++;
    
    // Set a warning timeout
    const firstWarningTimeout = setTimeout(() => {
      console.log('Long response warning triggered');
      toast.info("Ixty AI is still thinking. This might take a moment...");
      
      emitDebugEvent({
        lastAction: 'Long response warning triggered',
        isLoading: true,
        inputState: 'Waiting for response'
      });
      
      window.dispatchEvent(new CustomEvent('aiResponseStatus', { 
        detail: { 
          status: 'responding',
          duration: 30000,
          messageId: userMessage.id
        } 
      }));
    }, 30000);

    try {
      console.log('Sending message:', {
        attempt: messageAttempts.current,
        isAuthenticated,
        timestamp: new Date().toISOString()
      });
      
      emitDebugEvent({
        lastAction: `Sending to API (attempt ${messageAttempts.current})`,
        isLoading: true
      });
      
      console.time(`messageResponse_${userMessage.id}`);
      const response = await sendMessage({
        message: userMessage.content,
        onError: (error) => {
          console.error('Error in AI response:', error);
          emitDebugEvent({
            lastError: `Error in AI response: ${error.message}`,
            isLoading: true
          });
        }
      });
      console.timeEnd(`messageResponse_${userMessage.id}`);
      
      emitDebugEvent({
        lastAction: 'API response received',
        isLoading: true
      });
      
      // Create AI response message
      const aiMessage: Message = {
        id: uuidv4(),
        content: response.content,
        sender: 'ai',
        timestamp: new Date()
      };
      
      console.log('AI response received:', {
        messageId: aiMessage.id,
        responseTime: aiMessage.timestamp.getTime() - userMessage.timestamp.getTime(),
        contentLength: response.content.length
      });
      
      emitDebugEvent({
        lastAction: `AI response received (ID: ${aiMessage.id.substring(0, 8)}...)`,
        isLoading: false,
        inputState: 'Ready'
      });
      
      addMessage(aiMessage);
      messageAttempts.current = 0;
    } catch (error) {
      console.error('Error getting AI response:', {
        error,
        attempt: messageAttempts.current,
        messageId: userMessage.id
      });
      
      emitDebugEvent({
        lastError: error instanceof Error 
          ? `API Error: ${error.message}`
          : 'Unknown API error',
        isLoading: true
      });
      
      if (messageAttempts.current < maxRetries && error instanceof Error && 
          !error.message.includes('abort')) {
        console.log('Scheduling message retry...');
        
        emitDebugEvent({
          lastAction: `Scheduling retry ${messageAttempts.current}/${maxRetries}`,
          isLoading: true
        });
        
        pendingTimeout.current = setTimeout(() => {
          handleSubmit();
        }, Math.pow(2, messageAttempts.current) * 1000);
        return;
      }
      
      toast.error('Failed to get a response. Please try again.');
      
      // Important: Add an error message to the chat so the user knows what happened
      const errorMessage: Message = {
        id: uuidv4(),
        content: "I'm sorry, but I encountered an error processing your message. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
        metadata: { error: true }
      };
      
      emitDebugEvent({
        lastAction: 'Adding error message to chat',
        lastError: 'Failed to get API response after max retries',
        isLoading: false,
        inputState: 'Ready'
      });
      
      addMessage(errorMessage);
    } finally {
      clearTimeout(firstWarningTimeout);
      if (pendingTimeout.current) {
        clearTimeout(pendingTimeout.current);
        pendingTimeout.current = null;
      }
      
      // Ensure we ALWAYS reset loading state
      setIsLoading(false);
      
      console.log('Message submission flow completed', {
        messageId: userMessage.id,
        successful: messageAttempts.current === 0,
        timestamp: new Date().toISOString()
      });
      
      emitDebugEvent({
        lastAction: 'Message submission completed',
        isLoading: false,
        inputState: 'Ready'
      });
    }
  }, [message, isAuthenticated, isAuthLoading, addMessage, setMessage, setIsLoading]);

  return { handleSubmit };
};
