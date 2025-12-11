
import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { sendRecallRequest, RecallResponse } from '@/services/webhook/recall-webhook';
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
  clearContext: () => void;
}

const initialState: RecallState = {
  isRecallMode: false,
  isLoading: false,
  recallMessages: [],
  selectedIndex: 0,
  selectedDatetime: null,
  contextMessage: null,
};

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
      const response = await sendRecallRequest(userId, datetime, true);
      
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
        description: 'Failed to retrieve chat history. Please try again.',
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

    setRecallState(prev => ({
      ...prev,
      isRecallMode: false,
      recallMessages: [],
      contextMessage: message,
    }));

    toast({
      title: 'Context loaded',
      description: `Using context from ${new Date(message.timestamp).toLocaleString()}`,
    });
  }, [toast]);

  const cancelRecall = useCallback(() => {
    logger.info('[ChatRecall] Recall cancelled');
    setRecallState(prev => ({
      ...prev,
      isRecallMode: false,
      isLoading: false,
      recallMessages: [],
      selectedDatetime: null,
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

  return {
    recallState,
    activateRecall,
    selectContextMessage,
    cancelRecall,
    clearContext,
  };
}
