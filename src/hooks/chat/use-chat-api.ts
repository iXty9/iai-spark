
import { useCallback } from 'react';
import { processMessage } from '@/services/chat/message-processor';
import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';

interface UseChatApiProps {
  user: any;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  onError: (error: string) => void;
}

export const useChatApi = ({ user, addMessage, updateMessage, onError }: UseChatApiProps) => {
  const sendMessageToApi = useCallback(async (userMessage: Message) => {
    try {
      // Prepare user profile with ID for webhook
      const userProfile = user ? {
        id: user.id, // Ensure user ID is included
        username: user.user_metadata?.username,
        first_name: user.user_metadata?.first_name,
        last_name: user.user_metadata?.last_name,
      } : null;

      let aiMessageId: string | null = null;

      await processMessage({
        message: userMessage.content,
        onMessageStart: (message: Message) => {
          aiMessageId = message.id;
          addMessage(message);
        },
        onMessageStream: (content: string) => {
          // Update the existing AI message with streaming content
          if (aiMessageId) {
            updateMessage(aiMessageId, {
              content,
              pending: true,
            });
          }
        },
        onMessageComplete: (message: Message) => {
          // Final update with complete message data
          if (aiMessageId) {
            updateMessage(aiMessageId, {
              ...message,
              pending: false,
            });
          }
        },
        onError: (error: Error) => {
          logger.error('API Error:', error);
          onError(error.message);
        },
        isAuthenticated: !!user,
        userProfile,
      });
    } catch (error: any) {
      logger.error('Error in sendMessageToApi:', error);
      onError(error.message || 'Failed to send message');
    }
  }, [user, addMessage, updateMessage, onError]);

  return { sendMessageToApi };
};
