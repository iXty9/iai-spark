
import { useCallback } from 'react';
import { Message } from '@/types/chat';
import { processMessage } from '@/services/chat/message-processor';
import { logger } from '@/utils/logging';

interface UseChatApiProps {
  user: any;
  addMessage: (message: Message) => void;
  onError: (error: string) => void;
}

export const useChatApi = ({ user, addMessage, onError }: UseChatApiProps) => {
  const sendMessageToApi = useCallback(async (userMessage: Message) => {
    try {
      // Use the real message processor
      const aiResponse = await processMessage({
        message: userMessage.content,
        isAuthenticated: !!user,
        userProfile: user ? {
          username: user.user_metadata?.username,
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name
        } : null,
        onError: (error) => {
          logger.error('Error in AI response:', error);
          onError(error.message || 'Failed to get AI response');
        }
      });

      console.log('AI response from message processor:', {
        id: aiResponse.id,
        keys: Object.keys(aiResponse),
        hasTokenInfo: !!aiResponse.tokenInfo,
        hasThreadId: !!aiResponse.threadId,
        hasRawRequest: !!aiResponse.rawRequest,
        hasRawResponse: !!aiResponse.rawResponse,
        tokenInfo: aiResponse.tokenInfo
      });

      // Convert the enhanced response to our message format, preserving ALL data
      const aiMessage: Message = {
        id: aiResponse.id,
        content: aiResponse.content,
        sender: 'ai',
        timestamp: aiResponse.timestamp,
        metadata: aiResponse.metadata,
        tokenInfo: aiResponse.tokenInfo,
        threadId: aiResponse.threadId,
        rawRequest: aiResponse.rawRequest,
        rawResponse: aiResponse.rawResponse
      };
      
      console.log('Final AI message being added:', {
        id: aiMessage.id,
        keys: Object.keys(aiMessage),
        hasTokenInfo: !!aiMessage.tokenInfo,
        hasThreadId: !!aiMessage.threadId,
        tokenInfo: aiMessage.tokenInfo
      });
      
      addMessage(aiMessage);

      return aiMessage;
    } catch (err: any) {
      logger.error('Error in sendMessageToApi:', err);
      throw err;
    }
  }, [user, addMessage, onError]);

  return { sendMessageToApi };
};
