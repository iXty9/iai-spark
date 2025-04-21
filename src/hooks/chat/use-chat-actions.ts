
import { useCallback } from 'react';
import { Message } from '@/types/chat';
import { exportChat } from '@/services/chatService';
import { toast } from '@/components/ui/sonner';
import { emitDebugEvent } from '@/utils/debug-events';

export const useChatActions = (messages: Message[]) => {
  const handleExportChat = useCallback(() => {
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
  }, [messages]);

  return { handleExportChat };
};
