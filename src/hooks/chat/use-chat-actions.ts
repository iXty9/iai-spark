
import { useCallback } from 'react';
import { Message } from '@/types/chat';
import { exportChat } from '@/services/export/exportService';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';
import { v4 as uuidv4 } from 'uuid';
import { broadcastTypingStatus } from '@/hooks/chat/use-chat-sync';

interface UseChatActionsProps {
  userId: string | null;
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
  userId,
  message,
  setMessage,
  isLoading,
  setIsLoading,
  addMessage,
  clearMessages,
  resetState,
  sendMessageToApi
}: UseChatActionsProps) => {
  
  const handleSubmit = useCallback(async (e?: React.FormEvent, overrideMessage?: string) => {
    if (e) e.preventDefault();
    
    // Use overrideMessage if provided (for attachments), otherwise use state
    const messageToSend = overrideMessage ?? message;
    
    if (!messageToSend.trim() || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: uuidv4(),
      content: messageToSend.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    // Add user message and clear input
    addMessage(userMessage);
    setMessage('');
    setIsLoading(true);
    
    // Broadcast typing status to other instances (authenticated users only)
    if (userId) {
      broadcastTypingStatus(userId, true).catch(err => 
        console.error('Failed to broadcast typing status:', err)
      );
    }

    try {
      // Send to API
      await sendMessageToApi(userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      // Always ensure loading is cleared
      setIsLoading(false);
      
      // Broadcast typing stopped to other instances
      if (userId) {
        broadcastTypingStatus(userId, false).catch(err => 
          console.error('Failed to broadcast typing status:', err)
        );
      }
    }
  }, [userId, message, isLoading, addMessage, setMessage, setIsLoading, sendMessageToApi]);

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
    
    // Broadcast typing status to other instances (authenticated users only)
    if (userId) {
      broadcastTypingStatus(userId, true).catch(err => 
        console.error('Failed to broadcast typing status:', err)
      );
    }

    try {
      // Send to API
      await sendMessageToApi(userMessage);
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      // Always ensure loading is cleared
      setIsLoading(false);
      
      // Broadcast typing stopped to other instances
      if (userId) {
        broadcastTypingStatus(userId, false).catch(err => 
          console.error('Failed to broadcast typing status:', err)
        );
      }
    }
  }, [userId, addMessage, setIsLoading, sendMessageToApi]);

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
