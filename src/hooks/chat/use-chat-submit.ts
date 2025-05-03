
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { sendMessage } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';
import { useMessageRetry } from './use-message-retry';
import { useSubmitState } from './use-submit-state';
import { logger } from '@/utils/logging';

// Separate debug functionality
const emitDebugSubmitEvent = (action: string, error: string | null = null) => {
  emitDebugEvent({
    lastAction: action,
    lastError: error,
    isLoading: action.includes('starting') || action.includes('waiting'),
    inputState: action.includes('starting') ? 'Sending' : (action.includes('waiting') ? 'Waiting for response' : 'Ready')
  });
};

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

  // Track the current request so it can be aborted
  let currentRequest: { cancel?: () => void } | null = null;

  // Handle aborting the current request
  const handleAbortRequest = useCallback(() => {
    if (currentRequest && typeof currentRequest.cancel === 'function') {
      currentRequest.cancel();
      setIsLoading(false);
      setSubmitting(false);
      
      logger.info('Request aborted by user', null, { module: 'chat' });
      emitDebugSubmitEvent('Request aborted by user');
      
      // Dispatch event for UI components to update
      window.dispatchEvent(new CustomEvent('aiResponseAborted', { 
        detail: { abortedAt: new Date().toISOString() } 
      }));
    }
  }, [setIsLoading, setSubmitting]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

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
      
      toast.error("Please wait while we load your profile...");
      setIsLoading(false);
      
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
    incrementAttempt();
    
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
      
      toast.info("Ixty AI is still thinking. This might take a moment...");
      
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
          emitDebugSubmitEvent(null, `Error in AI response: ${error.message}`);
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
      clearRetry();
      currentRequest = null;
      
    } catch (error) {
      logger.error('Error getting AI response', {
        error,
        messageId: userMessage.id
      }, { module: 'chat' });
      
      // Notify that request ended with error
      window.dispatchEvent(new CustomEvent('aiRequestError', { 
        detail: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          messageId: userMessage.id
        } 
      }));
      
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
      currentRequest = null;
      
      logger.info('Message submission flow completed', {
        messageId: userMessage.id
      }, { module: 'chat', throttle: true });
    }
  }, [message, isAuthenticated, isAuthLoading, addMessage, setMessage, setIsLoading, handleRetry, clearRetry, incrementAttempt, isSubmitting, setSubmitting]);

  return { handleSubmit, handleAbortRequest };
};
