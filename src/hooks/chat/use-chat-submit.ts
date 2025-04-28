
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { sendMessage } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';
import { useMessageRetry } from './use-message-retry';
import { useSubmitState } from './use-submit-state';
import { logger } from '@/utils/logging';

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
      logger.warn('Submit prevented: Already submitting a message', null, { module: 'chat' });
      
      emitDebugEvent({
        lastAction: 'Submit prevented: Already submitting another message',
        isLoading: true
      });
      return;
    }

    // Check for empty message
    if (!message.trim()) {
      logger.warn('Submit prevented: Empty message', null, { module: 'chat' });
      
      emitDebugEvent({
        lastAction: 'Submit prevented: Empty message',
        isLoading: false
      });
      return;
    }
    
    // Early return for auth loading
    if (isAuthLoading) {
      logger.warn('Message submission blocked: Auth still loading', null, { module: 'auth' });
      
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
    
    logger.info('New message created', {
      messageId: userMessage.id,
      contentLength: message.length,
      isAuthenticated
    }, { module: 'chat' });
    
    // Clear the input and add user message
    setMessage('');
    addMessage(userMessage);
    setIsLoading(true);
    incrementAttempt();
    
    // Set a warning timeout for long responses
    const firstWarningTimeout = setTimeout(() => {
      logger.info('Long response warning triggered', null, { module: 'chat' });
      
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
      emitDebugEvent({
        lastAction: `Sending to API`,
        isLoading: true
      });
      
      const response = await sendMessage({
        message: userMessage.content,
        isAuthenticated: isAuthenticated,
        onError: (error) => {
          logger.error('Error in AI response', error, { module: 'chat' });
          
          emitDebugEvent({
            lastError: `Error in AI response: ${error.message}`,
            isLoading: true
          });
        }
      });
      
      // Create AI response message
      const aiMessage: Message = {
        id: uuidv4(),
        content: response.content,
        sender: 'ai',
        timestamp: new Date()
      };
      
      logger.info('AI response received', {
        messageId: aiMessage.id,
        responseTime: aiMessage.timestamp.getTime() - userMessage.timestamp.getTime(),
        contentLength: response.content.length
      }, { module: 'chat' });
      
      addMessage(aiMessage);
      clearRetry();
      
    } catch (error) {
      logger.error('Error getting AI response', {
        error,
        messageId: userMessage.id
      }, { module: 'chat' });
      
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
      
      logger.info('Message submission flow completed', {
        messageId: userMessage.id
      }, { module: 'chat', throttle: true });
    }
  }, [message, isAuthenticated, isAuthLoading, addMessage, setMessage, setIsLoading, handleRetry, clearRetry, incrementAttempt, isSubmitting, setSubmitting]);

  return { handleSubmit };
};
