
import { useCallback, useRef } from 'react';
import { Message } from '@/types/chat';
import { processMessage } from '@/services/chat/message-processor';
import { logger } from '@/utils/logging';

interface UseChatApiProps {
  user: any;
  addMessage: (message: Message) => void;
  onError: (error: string) => void;
  setCurrentRequest: (request: { cancel: () => void } | null) => void;
}

export const useChatApi = ({ user, addMessage, onError, setCurrentRequest }: UseChatApiProps) => {
  const sendMessageToApi = useCallback(async (userMessage: Message) => {
    let currentCancelFunction: (() => void) | null = null;
    
    try {
      // Use the real message processor with callbacks to get cancel function immediately
      const aiResponse = await processMessage({
        message: userMessage.content,
        isAuthenticated: !!user,
        userProfile: user ? {
          id: user.id,
          username: user.user_metadata?.username,
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name
        } : null,
        onMessageStart: (message) => {
          // Set current request immediately when message processing starts
          if (message && typeof message === 'object' && 'cancel' in message && typeof message.cancel === 'function') {
            const cancelFn = message.cancel as () => void;
            currentCancelFunction = cancelFn;
            setCurrentRequest({ cancel: cancelFn });
          }
        },
        onError: (error) => {
          logger.error('Error in AI response:', error);
          onError(error.message || 'Failed to get AI response');
          setCurrentRequest(null);
        }
      });

      // Also set cancel function from final response as backup
      if (aiResponse.cancel && !currentCancelFunction) {
        setCurrentRequest({ cancel: aiResponse.cancel });
      }

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

      // Clear the current request when complete
      setCurrentRequest(null);

      // Trigger chat message sound for AI responses (don't await to avoid blocking UI)
      if (user?.id) {
        import('@/services/notification-service').then(({ notificationService }) => {
          notificationService.showChatMessage(aiMessage.content, 'AI Assistant').catch(console.error);
        }).catch(console.error);
      }

      return aiMessage;
    } catch (err: any) {
      logger.error('Error in sendMessageToApi:', err);
      setCurrentRequest(null);
      throw err;
    }
  }, [user, addMessage, onError]);

  return { sendMessageToApi };
};
