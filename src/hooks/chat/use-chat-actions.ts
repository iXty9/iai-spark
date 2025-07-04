
import { useCallback } from 'react';
import { Message } from '@/types/chat';
import { exportChat } from '@/services/export/exportService';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';
import { v4 as uuidv4 } from 'uuid';

interface UseChatActionsProps {
  message: string;
  setMessage: (message: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  resetState: () => void;
  sendMessageToApi: (message: Message) => Promise<Message>;
}

export const useChatActions = ({
  message,
  setMessage,
  isLoading,
  setIsLoading,
  addMessage,
  clearMessages,
  resetState,
  sendMessageToApi
}: UseChatActionsProps) => {
  
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!message.trim() || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: uuidv4(),
      content: message.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    // Add user message and clear input
    addMessage(userMessage);
    setMessage('');
    setIsLoading(true);

    try {
      // Send to API
      await sendMessageToApi(userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      // Always ensure loading is cleared
      setIsLoading(false);
    }
  }, [message, isLoading, addMessage, setMessage, setIsLoading, sendMessageToApi]);

  const handleClearChat = useCallback(() => {
    clearMessages();
    resetState();
  }, [clearMessages, resetState]);

  const startChat = useCallback(async (initialMessage: string) => {
    if (!initialMessage.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      content: initialMessage.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    // Add user message
    addMessage(userMessage);
    setIsLoading(true);

    try {
      // Send to API
      await sendMessageToApi(userMessage);
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      // Always ensure loading is cleared
      setIsLoading(false);
    }
  }, [addMessage, setIsLoading, sendMessageToApi]);

  const handleExportChat = useCallback((messages: Message[]) => {
    if (messages.length === 0) {
      console.warn('Export attempted with no messages');
      toast.error('No messages to export');
      return;
    }
    
    console.log('Exporting chat:', {
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    });
    
    emitDebugEvent({
      lastAction: 'Exporting chat'
    });
    
    try {
      exportChat(messages);
      toast.success('Chat exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export chat');
      emitDebugEvent({
        lastError: 'Export failed'
      });
    }
  }, []);

  return {
    handleSubmit,
    handleClearChat,
    handleExportChat,
    startChat
  };
};
