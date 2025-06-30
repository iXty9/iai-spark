
import { useEffect, useRef } from 'react';
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
  const hasLoadedRef = useRef(false);

  // Load messages on mount - only once
  useEffect(() => {
    if (hasLoadedRef.current) return;
    
    try {
      const storedMessages = loadChatHistory();
      if (storedMessages.length > 0) {
        setMessages(storedMessages);
        logger.debug('Messages loaded from storage', { count: storedMessages.length }, { module: 'storage' });
      }
      hasLoadedRef.current = true;
    } catch (error) {
      logger.error('Failed to load messages from storage:', error, { module: 'storage' });
    }
  }, [setMessages]);

  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0 && hasLoadedRef.current) {
      try {
        saveChatHistory(messages);
      } catch (error) {
        logger.error('Failed to save messages to storage:', error, { module: 'storage' });
      }
    }
  }, [messages]);

  // Clean up old storage entries on first load
  useEffect(() => {
    const oldStorageKey = 'chat_messages';
    const oldData = localStorage.getItem(oldStorageKey);
    if (oldData) {
      try {
        localStorage.removeItem(oldStorageKey);
        logger.debug('Old chat storage cleaned up', null, { module: 'storage' });
      } catch (error) {
        logger.error('Failed to clean up old storage:', error, { module: 'storage' });
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
