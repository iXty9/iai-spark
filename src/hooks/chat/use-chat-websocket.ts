
import { useEffect } from 'react';
import { Message } from '@/types/chat';
import { useWebSocket, ProactiveMessage } from '@/contexts/WebSocketContext';
import { logger } from '@/utils/logging';
import { notificationService } from '@/services/notification-service';

interface UseChatWebSocketProps {
  addMessage: (message: Message) => void;
  messages: Message[]; // Add messages array to determine current screen
}

export const useChatWebSocket = ({ addMessage, messages }: UseChatWebSocketProps) => {
  const { isConnected, isEnabled, onProactiveMessage } = useWebSocket();

  // Handle proactive messages in chat - create complete Message objects
  useEffect(() => {
    const unsubscribe = onProactiveMessage((proactiveMessage: ProactiveMessage) => {
      // Only process proactive messages if we're already in chat screen (have existing messages)
      // This prevents duplicate messages during welcome screen transition
      if (messages.length === 0) {
        logger.info('Skipping proactive message processing - currently on welcome screen', {
          messageId: proactiveMessage.id,
          messagesCount: messages.length
        });
        return;
      }

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
      
      // Add the message to the chat and play sound
      addMessage(chatMessage);
      
      // Play chat message sound for proactive messages
      notificationService.showChatMessage(proactiveMessage.content, 'AI Assistant');
    });

    return unsubscribe;
  }, [onProactiveMessage, addMessage, messages.length]);

  return { isWebSocketConnected: isConnected, isWebSocketEnabled: isEnabled };
};
