
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { processMessage } from '@/services/chat/message-processor';
import { logger } from '@/utils/logging';
import { useSubmitState } from './use-submit-state';
import { useMessageRetry } from './use-message-retry';
import { useErrorHandling } from './use-error-handling';
import { emitDebugSubmitEvent } from './utils/debug-submit-events';
import { handleAbortRequest, RequestHandler } from './utils/request-tracking';

interface UseChatSubmitProps {
  message: string;
  setMessage: (msg: string) => void;
  addMessage: (msg: Message) => void;
  setIsLoading: (loading: boolean) => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  userProfile?: { username?: string; first_name?: string; last_name?: string } | null;
}

export const useChatSubmit = ({
  message,
  setMessage,
  addMessage,
  setIsLoading,
  isAuthenticated,
  isAuthLoading,
  userProfile
}: UseChatSubmitProps) => {
  const { setSubmitting, isSubmitting } = useSubmitState();
  const { handleSubmissionError } = useErrorHandling({ addMessage });
  
  let currentRequest: RequestHandler | null = null;
  
  const handleSubmitWithRetry = useCallback(async () => {
    if (isSubmitting) {
      logger.warn('Submit prevented: Already submitting a message', null, { module: 'chat' });
      if (process.env.NODE_ENV === 'development') {
        emitDebugSubmitEvent('Submit prevented: Already submitting another message');
      }
      return;
    }

    if (!message.trim()) {
      logger.warn('Submit prevented: Empty message', null, { module: 'chat' });
      if (process.env.NODE_ENV === 'development') {
        emitDebugSubmitEvent('Submit prevented: Empty message');
      }
      return;
    }
    
    if (isAuthLoading) {
      logger.warn('Message submission blocked: Auth still loading', null, { module: 'auth' });
      if (process.env.NODE_ENV === 'development') {
        emitDebugSubmitEvent('Message submission blocked: Auth still loading', 'Auth loading in progress');
      }
      return;
    }

    setSubmitting(true);

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
    
    setMessage('');
    addMessage(userMessage);
    setIsLoading(true);
    
    if (process.env.NODE_ENV === 'development') {
      emitDebugSubmitEvent('Message submission starting');
    }
    
    const requestStartTime = Date.now();
    window.dispatchEvent(new CustomEvent('aiRequestStart', { 
      detail: { startTime: requestStartTime, messageId: userMessage.id } 
    }));
    
    const firstWarningTimeout = setTimeout(() => {
      logger.info('Long response warning triggered', null, { module: 'chat' });
      if (process.env.NODE_ENV === 'development') {
        emitDebugSubmitEvent('Long response warning triggered');
      }
      window.dispatchEvent(new CustomEvent('aiResponseStatus', { 
        detail: { status: 'responding', duration: 30000, messageId: userMessage.id } 
      }));
    }, 30000);

    try {
      if (process.env.NODE_ENV === 'development') {
        emitDebugSubmitEvent('Sending to API');
      }
      
      const aiResponse = await processMessage({
        message: userMessage.content,
        isAuthenticated: isAuthenticated,
        userProfile: userProfile,
        onError: (error) => {
          logger.error('Error in AI response', error, { module: 'chat' });
          if (process.env.NODE_ENV === 'development') {
            emitDebugSubmitEvent('Error in AI response', `Error in AI response: ${error.message}`);
          }
        }
      });
      
      const aiMessage: Message = {
        id: uuidv4(),
        content: aiResponse.content || 'No response received',
        sender: 'ai',
        timestamp: new Date()
      };
      
      logger.info('AI response received', {
        messageId: aiMessage.id,
        responseTime: aiMessage.timestamp.getTime() - userMessage.timestamp.getTime(),
        contentLength: aiMessage.content.length
      }, { module: 'chat' });
      
      window.dispatchEvent(new CustomEvent('aiRequestEnd', { 
        detail: { duration: Date.now() - requestStartTime, messageId: userMessage.id } 
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
  }, [message, isAuthenticated, isAuthLoading, addMessage, setMessage, setIsLoading, isSubmitting, setSubmitting, handleSubmissionError, userProfile]);
  
  const { handleRetry, clearRetry, incrementAttempt, resetAttempts } = useMessageRetry({ 
    handleSubmit: () => handleSubmitWithRetry()
  });

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    incrementAttempt();
    
    try {
      await handleSubmitWithRetry();
      resetAttempts();
    } catch (error) {
      const retryHandled = handleRetry(error as Error);
      if (!retryHandled) {
        resetAttempts();
      }
    }
  }, [handleSubmitWithRetry, incrementAttempt, resetAttempts, handleRetry]);

  const handleAbortRequestCallback = useCallback(() => {
    return handleAbortRequest(currentRequest, setIsLoading, setSubmitting);
  }, [setIsLoading, setSubmitting]);

  return { 
    handleSubmit, 
    handleAbortRequest: handleAbortRequestCallback 
  };
};
