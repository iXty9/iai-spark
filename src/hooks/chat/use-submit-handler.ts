
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { sendMessage } from '@/services/chat';
import { logger } from '@/utils/logging';
import { useSubmitState } from './use-submit-state';
import { useMessageRetry } from './use-message-retry';
import { useErrorHandling } from './use-error-handling';
import { emitDebugSubmitEvent } from './utils/debug-submit-events';
import { handleAbortRequest, RequestHandler } from './utils/request-tracking';

interface UseSubmitHandlerProps {
  message: string;
  setMessage: (msg: string) => void;
  addMessage: (msg: Message) => void;
  setIsLoading: (loading: boolean) => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}

export const useSubmitHandler = ({
  message,
  setMessage,
  addMessage,
  setIsLoading,
  isAuthenticated,
  isAuthLoading
}: UseSubmitHandlerProps) => {
  const { setSubmitting, isSubmitting } = useSubmitState();
  const { handleSubmissionError } = useErrorHandling({ addMessage });
  
  // Track the current request so it can be aborted
  let currentRequest: RequestHandler | null = null;
  
  const handleSubmitWithRetry = useCallback(async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      logger.warn('Submit prevented: Already submitting a message', null, { module: 'chat' });
      
      // Debug only
      emitDebugSubmitEvent('Submit prevented: Already submitting another message');
      return;
    }

    // Check for empty message
    if (!message.trim()) {
      logger.warn('Submit prevented: Empty message', null, { module: 'chat' });
      
      // Debug only
      emitDebugSubmitEvent('Submit prevented: Empty message');
      return;
    }
    
    // Early return for auth loading
    if (isAuthLoading) {
      logger.warn('Message submission blocked: Auth still loading', null, { module: 'auth' });
      
      // Debug only
      emitDebugSubmitEvent(
        'Message submission blocked: Auth still loading', 
        'Auth loading in progress'
      );
      return;
    }

    // Set submission flag
    setSubmitting(true);

    // Create user message - core business logic
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
    
    // Clear the input and add user message - core business logic
    setMessage('');
    addMessage(userMessage);
    setIsLoading(true);
    
    // Debug only
    emitDebugSubmitEvent('Message submission starting');
    
    // Track the request start time for the timer
    const requestStartTime = Date.now();
    window.dispatchEvent(new CustomEvent('aiRequestStart', { 
      detail: { 
        startTime: requestStartTime,
        messageId: userMessage.id
      } 
    }));
    
    // Set a warning timeout for long responses - core business logic
    const firstWarningTimeout = setTimeout(() => {
      logger.info('Long response warning triggered', null, { module: 'chat' });
      
      // Debug only
      emitDebugSubmitEvent('Long response warning triggered');
      
      // This event is used by components that need to know about long-running responses
      window.dispatchEvent(new CustomEvent('aiResponseStatus', { 
        detail: { 
          status: 'responding',
          duration: 30000,
          messageId: userMessage.id
        } 
      }));
    }, 30000);

    try {
      // Debug only
      emitDebugSubmitEvent('Sending to API');
      
      // Core business logic - send the message and store the response
      currentRequest = await sendMessage({
        message: userMessage.content,
        isAuthenticated: isAuthenticated,
        onError: (error) => {
          logger.error('Error in AI response', error, { module: 'chat' });
          
          // Debug only
          emitDebugSubmitEvent('Error in AI response', `Error in AI response: ${error.message}`);
        }
      });
      
      // Create AI response message using the response from chatService
      const aiMessage: Message = {
        id: uuidv4(),
        content: '', // Default empty content
        sender: 'ai',
        timestamp: new Date()
      };
      
      // If currentRequest exists and has a response, use that content
      if (currentRequest && typeof currentRequest === 'object') {
        // If it's a Message with content, use that content
        if ('content' in currentRequest && typeof currentRequest.content === 'string') {
          aiMessage.content = currentRequest.content;
        }
      }
      
      logger.info('AI response received', {
        messageId: aiMessage.id,
        responseTime: aiMessage.timestamp.getTime() - userMessage.timestamp.getTime(),
        contentLength: aiMessage.content.length
      }, { module: 'chat' });
      
      // Notify that request is complete
      window.dispatchEvent(new CustomEvent('aiRequestEnd', { 
        detail: { 
          duration: Date.now() - requestStartTime,
          messageId: userMessage.id
        } 
      }));
      
      addMessage(aiMessage);
      currentRequest = null;
      
    } catch (error) {
      if (error instanceof Error) {
        handleSubmissionError(error);
      } else {
        handleSubmissionError(new Error('Unknown error'));
      }
    } finally {
      clearTimeout(firstWarningTimeout);
      setIsLoading(false);
      setSubmitting(false);
      
      logger.info('Message submission flow completed', {
        messageId: userMessage.id
      }, { module: 'chat', throttle: true });
    }
  }, [message, isAuthenticated, isAuthLoading, addMessage, setMessage, setIsLoading, isSubmitting, setSubmitting]);
  
  const { handleRetry, clearRetry, incrementAttempt } = useMessageRetry({ 
    handleSubmit: () => handleSubmitWithRetry()
  });

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    incrementAttempt();
    return handleSubmitWithRetry();
  }, [handleSubmitWithRetry, incrementAttempt]);

  const handleAbort = useCallback(() => {
    return handleAbortRequest(currentRequest, setIsLoading, setSubmitting);
  }, [setIsLoading, setSubmitting]);

  return { 
    handleSubmit, 
    handleAbortRequest: handleAbort 
  };
};
