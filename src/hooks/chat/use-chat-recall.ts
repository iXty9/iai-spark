
import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { sendRecallRequest, RecallError } from '@/services/webhook/recall-webhook';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';

export interface RecallState {
  isRecallMode: boolean;
  isLoading: boolean;
  recallMessages: Message[];
  selectedIndex: number;
  selectedDatetime: string | null;
  contextMessage: Message | null;
}

export interface UseChatRecallReturn {
  recallState: RecallState;
  activateRecall: (userId: string, datetime: string) => Promise<boolean>;
  selectContextMessage: (message: Message) => void;
  cancelRecall: () => void;
  exitRecallMode: () => void;
  clearContext: () => void;
  showRecallHistory: () => void;
}

const initialState: RecallState = {
  isRecallMode: false,
  isLoading: false,
  recallMessages: [],
  selectedIndex: 0,
  selectedDatetime: null,
  contextMessage: null,
};

function getErrorMessage(error: RecallError): { title: string; description: string } {
  switch (error.type) {
    case 'not_configured':
      return {
        title: 'Webhook not configured',
        description: 'Please configure the Chat Recall webhook URL in Admin Panel > Webhooks.',
      };
    case 'network_error':
      return {
        title: 'Connection failed',
        description: `Could not reach the webhook endpoint. ${error.message}`,
      };
    case 'backend_error':
      return {
        title: 'Backend error',
        description: error.status 
          ? `The webhook returned an error (${error.status}): ${error.message}`
          : `The webhook returned an error: ${error.message}`,
      };
  }
}

export function useChatRecall(): UseChatRecallReturn {
  const [recallState, setRecallState] = useState<RecallState>(initialState);
  const { toast } = useToast();

  const activateRecall = useCallback(async (userId: string, datetime: string): Promise<boolean> => {
    logger.info('[ChatRecall] Activating recall for datetime:', datetime);
    
    setRecallState(prev => ({
      ...prev,
      isLoading: true,
      selectedDatetime: datetime,
    }));

    try {
      const { data: response, error } = await sendRecallRequest(userId, datetime, true);
      
      if (error) {
        const { title, description } = getErrorMessage(error);
        toast({
          variant: 'destructive',
          title,
          description,
        });
        setRecallState(prev => ({
          ...prev,
          isLoading: false,
        }));
        return false;
      }
      
      if (!response || response.messages.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No messages found',
          description: 'No chat history found for the selected date and time.',
        });
        setRecallState(prev => ({
          ...prev,
          isLoading: false,
        }));
        return false;
      }

      setRecallState(prev => ({
        ...prev,
        isRecallMode: true,
        isLoading: false,
        recallMessages: response.messages,
        selectedIndex: response.selected_index,
      }));

      logger.info('[ChatRecall] Recall activated', { messageCount: response.messages.length });
      return true;
    } catch (error) {
      logger.error('[ChatRecall] Failed to activate recall:', error);
      toast({
        variant: 'destructive',
        title: 'Recall failed',
        description: 'An unexpected error occurred. Please try again.',
      });
      setRecallState(prev => ({
        ...prev,
        isLoading: false,
      }));
      return false;
    }
  }, [toast]);

  const selectContextMessage = useCallback((message: Message) => {
    logger.info('[ChatRecall] Context message selected:', {
      id: message.id,
      timestamp: message.timestamp,
    });

    // Preserve recallMessages so user can return to history viewer via History button
    setRecallState(prev => ({
      ...prev,
      isRecallMode: false,
      // Keep recallMessages intact for History button
      contextMessage: message,
    }));

    toast({
      title: 'Context loaded',
      description: `Using context from ${new Date(message.timestamp).toLocaleString()}`,
    });
  }, [toast]);

  const cancelRecall = useCallback(() => {
    logger.info('[ChatRecall] Recall cancelled - clearing all recall data');
    setRecallState(prev => ({
      ...prev,
      isRecallMode: false,
      isLoading: false,
      recallMessages: [],
      selectedDatetime: null,
    }));
  }, []);

  // Exit recall mode but preserve messages for History button navigation
  const exitRecallMode = useCallback(() => {
    logger.info('[ChatRecall] Exiting recall mode - preserving messages for history');
    setRecallState(prev => ({
      ...prev,
      isRecallMode: false,
    }));
  }, []);

  const clearContext = useCallback(() => {
    logger.info('[ChatRecall] Context cleared');
    setRecallState(prev => ({
      ...prev,
      contextMessage: null,
      selectedDatetime: null,
    }));

    toast({
      title: 'Context cleared',
      description: 'Chat recall context has been removed.',
    });
  }, [toast]);

  const showRecallHistory = useCallback(() => {
    // Only works if we have previously loaded messages
    if (recallState.recallMessages.length > 0) {
      logger.info('[ChatRecall] Showing recall history from memory', { messageCount: recallState.recallMessages.length });
      setRecallState(prev => ({
        ...prev,
        isRecallMode: true,
      }));
    }
  }, [recallState.recallMessages.length]);

  return {
    recallState,
    activateRecall,
    selectContextMessage,
    cancelRecall,
    exitRecallMode,
    clearContext,
    showRecallHistory,
  };
}
