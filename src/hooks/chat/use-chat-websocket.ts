
import { useEffect } from 'react';
import { Message } from '@/types/chat';
import { useWebSocket, ProactiveMessage } from '@/contexts/WebSocketContext';
import { logger } from '@/utils/logging';

interface UseChatWebSocketProps {
  addMessage: (message: Message) => void;
}

export const useChatWebSocket = ({ addMessage }: UseChatWebSocketProps) => {
  const { isConnected, isEnabled, onProactiveMessage } = useWebSocket();

  // Handle proactive messages in chat - create complete Message objects
  useEffect(() => {
    const unsubscribe = onProactiveMessage((proactiveMessage: ProactiveMessage) => {
      logger.info('Received proactive message in chat:', proactiveMessage);
      
      // Convert proactive message to complete chat message format
      const chatMessage: Message = {
        id: proactiveMessage.id,
        content: proactiveMessage.content,
        sender: 'ai',
        timestamp: proactiveMessage.timestamp,
        source: 'proactive', // Mark as proactive source
        metadata: { isProactive: true, ...proactiveMessage.metadata }
      };
      
      console.log('Adding proactive message to chat:', {
        id: chatMessage.id,
        keys: Object.keys(chatMessage),
        source: chatMessage.source
      });
      
      // Add the message to the chat (no toast notification - we have dedicated toast webhook now)
      addMessage(chatMessage);
    });

    return unsubscribe;
  }, [onProactiveMessage, addMessage]);

  return { isWebSocketConnected: isConnected, isWebSocketEnabled: isEnabled };
};
