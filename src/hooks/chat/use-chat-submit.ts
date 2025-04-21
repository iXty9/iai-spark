
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { sendMessage } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';
import { useMessageRetry } from './use-message-retry';
import { useSubmitState } from './use-submit-state';

export const useChatSubmit = (
  message: string,
  setMessage: (msg: string) => void,
  addMessage: (msg: Message) => void,
  setIsLoading: (loading: boolean) => void,
  isAuthenticated: boolean,
  isAuthLoading: boolean
) => {
  const { setSubmitting, isSubmitting } = useSubmitState();
  const { handleRetry, clearRetry, incrementAttempt } = useMessageRetry({ 
    handleSubmit: () => handleSubmit()
  });

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Prevent multiple submissions
    if (isSubmitting) {
      console.warn('Submit prevented: Already submitting a message');
      emitDebugEvent({
        lastAction: 'Submit prevented: Already submitting another message',
        isLoading: true
      });
      return;
    }

    // Check for empty message
    if (!message.trim()) {
      console.warn('Submit prevented: Empty message');
      emitDebugEvent({
        lastAction: 'Submit prevented: Empty message',
        isLoading: false
      });
      return;
    }
    
    // Early return for auth loading
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

    // Set submission flag
    setSubmitting(true);

    // Create user message
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
    
    // Clear the input and add user message
    setMessage('');
    addMessage(userMessage);
    setIsLoading(true);
    incrementAttempt();
    
    // Set a warning timeout for long responses
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
        messageId: userMessage.id,
        isAuthenticated,
        timestamp: new Date().toISOString()
      });
      
      emitDebugEvent({
        lastAction: `Sending to API`,
        isLoading: true
      });
      
      console.time(`messageResponse_${userMessage.id}`);
      const response = await sendMessage({
        message: userMessage.content,
        isAuthenticated: isAuthenticated,
        onError: (error) => {
          console.error('Error in AI response:', error);
          emitDebugEvent({
            lastError: `Error in AI response: ${error.message}`,
            isLoading: true
          });
        }
      });
      console.timeEnd(`messageResponse_${userMessage.id}`);
      
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
      
      addMessage(aiMessage);
      clearRetry();
      
    } catch (error) {
      console.error('Error getting AI response:', {
        error,
        messageId: userMessage.id
      });
      
      const shouldRetry = handleRetry(error instanceof Error ? error : new Error('Unknown error'));
      
      if (!shouldRetry) {
        toast.error('Failed to get a response. Please try again.');
        
        const errorMessage: Message = {
          id: uuidv4(),
          content: "I'm sorry, but I encountered an error processing your message. Please try again.",
          sender: 'ai',
          timestamp: new Date(),
          metadata: { error: true }
        };
        
        addMessage(errorMessage);
      }
    } finally {
      clearTimeout(firstWarningTimeout);
      setIsLoading(false);
      setSubmitting(false);
      
      console.log('Message submission flow completed', {
        messageId: userMessage.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [message, isAuthenticated, isAuthLoading, addMessage, setMessage, setIsLoading, handleRetry, clearRetry, incrementAttempt, isSubmitting, setSubmitting]);

  return { handleSubmit };
};
