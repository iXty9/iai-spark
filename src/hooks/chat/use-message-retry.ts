
import { useRef } from 'react';
import { Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';

interface UseMessageRetryProps {
  handleSubmit: () => void;
  maxRetries?: number;
}

export const useMessageRetry = ({ handleSubmit, maxRetries = 3 }: UseMessageRetryProps) => {
  const messageAttempts = useRef<number>(0);
  const pendingTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleRetry = (error: Error) => {
    console.log('Handling message retry:', {
      attempt: messageAttempts.current,
      maxRetries,
      error: error.message
    });

    if (messageAttempts.current < maxRetries && !error.message.includes('abort')) {
      console.log('Scheduling message retry...');
      
      emitDebugEvent({
        lastAction: `Scheduling retry ${messageAttempts.current}/${maxRetries}`,
        isLoading: true
      });
      
      if (pendingTimeout.current) {
        clearTimeout(pendingTimeout.current);
      }

      pendingTimeout.current = setTimeout(() => {
        handleSubmit();
      }, Math.pow(2, messageAttempts.current) * 1000);
      
      return true;
    }
    
    return false;
  };

  const clearRetry = () => {
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current);
      pendingTimeout.current = null;
    }
    messageAttempts.current = 0;
  };

  const incrementAttempt = () => {
    messageAttempts.current++;
  };

  const resetAttempts = () => {
    messageAttempts.current = 0;
  };

  return {
    handleRetry,
    clearRetry,
    incrementAttempt,
    resetAttempts,
    currentAttempt: messageAttempts.current
  };
};
