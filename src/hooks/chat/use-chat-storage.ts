
import { useEffect } from 'react';
import { Message } from '@/types/chat';
import { 
  saveChatHistory, 
  loadChatHistory, 
  clearChatHistory,
  saveScrollPosition,
  loadScrollPosition,
  clearScrollPosition
} from '@/services/storage/chatPersistenceService';
import { logger } from '@/utils/logging';

export const useChatStorage = (messages: Message[], setMessages: (msgs: Message[]) => void) => {
  // Load messages on mount
  useEffect(() => {
    const storedMessages = loadChatHistory();
    if (storedMessages.length > 0) {
      console.log('Loading messages from unified storage:', {
        count: storedMessages.length,
        sampleMessage: storedMessages[0] ? {
          id: storedMessages[0].id,
          keys: Object.keys(storedMessages[0]),
          hasTokenInfo: !!storedMessages[0].tokenInfo,
          hasThreadId: !!storedMessages[0].threadId,
          hasRawRequest: !!storedMessages[0].rawRequest
        } : null
      });
      setMessages(storedMessages);
    }
  }, [setMessages]);

  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      console.log('Saving messages to unified storage:', {
        count: messages.length,
        sampleMessage: messages[0] ? {
          id: messages[0].id,
          keys: Object.keys(messages[0]),
          hasTokenInfo: !!messages[0].tokenInfo,
          hasThreadId: !!messages[0].threadId,
          hasRawRequest: !!messages[0].rawRequest
        } : null
      });
      saveChatHistory(messages);
    }
  }, [messages]);

  // Clean up old storage entries on first load
  useEffect(() => {
    const oldStorageKey = 'chat_messages';
    const oldData = localStorage.getItem(oldStorageKey);
    if (oldData) {
      try {
        logger.info('Migrating old chat storage to unified system');
        localStorage.removeItem(oldStorageKey);
        logger.info('Old chat storage cleaned up');
      } catch (error) {
        logger.error('Failed to clean up old storage:', error);
      }
    }
  }, []);

  const clearStorage = () => {
    clearChatHistory();
  };

  const saveScroll = (position: number) => {
    saveScrollPosition(position);
  };

  const loadScroll = () => {
    return loadScrollPosition();
  };

  const clearScroll = () => {
    clearScrollPosition();
  };

  return { 
    clearStorage,
    saveScroll,
    loadScroll,
    clearScroll
  };
};
