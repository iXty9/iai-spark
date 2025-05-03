
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';
import { logger } from '@/utils/logging';
import { emitDebugSubmitEvent } from './utils/debug-submit-events';

interface UseErrorHandlingProps {
  addMessage: (msg: Message) => void;
}

export const useErrorHandling = ({ addMessage }: UseErrorHandlingProps) => {
  const handleSubmissionError = (error: Error) => {
    logger.error('Error getting AI response', {
      error,
    }, { module: 'chat' });
    
    // Notify that request ended with error
    window.dispatchEvent(new CustomEvent('aiRequestError', { 
      detail: { 
        error: error.message || 'Unknown error',
      } 
    }));
    
    toast.error('Failed to get a response. Please try again.');
    
    const errorMessage: Message = {
      id: uuidv4(),
      content: "I'm sorry, but I encountered an error processing your message. Please try again.",
      sender: 'ai',
      timestamp: new Date(),
      metadata: { error: true }
    };
    
    addMessage(errorMessage);
    
    // Debug only
    emitDebugSubmitEvent(null, `Error in AI response: ${error.message}`);
  };
  
  return { handleSubmissionError };
};
