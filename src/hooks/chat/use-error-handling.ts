
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';
import { logger } from '@/utils/logging';
import { handleError, ErrorType } from '@/utils/error-handling';
import { emitDebugSubmitEvent } from './utils/debug-submit-events';

interface UseErrorHandlingProps {
  addMessage: (msg: Message) => void;
}

export const useErrorHandling = ({ addMessage }: UseErrorHandlingProps) => {
  const handleSubmissionError = (error: Error) => {
    const appError = handleError(error, 'chat-submission');
    
    // Notify that request ended with error
    window.dispatchEvent(new CustomEvent('aiRequestError', { 
      detail: { 
        error: appError.message,
        type: appError.type
      } 
    }));
    
    // Show appropriate toast based on error type
    const getErrorMessage = (errorType: ErrorType): string => {
      switch (errorType) {
        case ErrorType.NETWORK:
          return 'Network error. Please check your connection and try again.';
        case ErrorType.AUTH:
          return 'Authentication error. Please sign in and try again.';
        case ErrorType.CONFIG:
          return 'Configuration error. Please check your settings.';
        default:
          return 'Failed to get a response. Please try again.';
      }
    };
    
    toast.error(getErrorMessage(appError.type));
    
    const errorMessage: Message = {
      id: uuidv4(),
      content: "I'm sorry, but I encountered an error processing your message. Please try again.",
      sender: 'ai',
      timestamp: new Date(),
      metadata: { 
        error: true,
        errorType: appError.type,
        errorCode: appError.code
      }
    };
    
    addMessage(errorMessage);
    
    // Debug only
    emitDebugSubmitEvent('Error in AI response', `Error in AI response: ${appError.message}`);
  };
  
  return { handleSubmissionError };
};
