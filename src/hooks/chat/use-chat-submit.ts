
import { useCallback } from 'react';
import { Message } from '@/types/chat';
import { useSubmitHandler } from './use-submit-handler';
import { emitDebugSubmitEvent } from './utils/debug-submit-events';

export const useChatSubmit = (
  message: string,
  setMessage: (msg: string) => void,
  addMessage: (msg: Message) => void,
  setIsLoading: (loading: boolean) => void,
  isAuthenticated: boolean,
  isAuthLoading: boolean
) => {
  // Initialize the submission handler with all required dependencies
  const { handleSubmit, handleAbortRequest } = useSubmitHandler({
    message,
    setMessage,
    addMessage,
    setIsLoading,
    isAuthenticated,
    isAuthLoading
  });

  // This ensures we're maintaining the same API as the original hook
  return {
    handleSubmit,
    handleAbortRequest
  };
};
