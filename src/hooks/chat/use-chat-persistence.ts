
import { useEffect } from 'react';
import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';

const STORAGE_KEY = 'chat_messages';

export const useChatPersistence = (messages: Message[], setMessages: (msgs: Message[]) => void) => {
  // Load messages on mount
  useEffect(() => {
    const storedMessages = localStorage.getItem(STORAGE_KEY);
    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages);
        console.log('Loading messages from localStorage:', {
          count: parsed.length,
          sampleMessage: parsed[0] ? {
            id: parsed[0].id,
            keys: Object.keys(parsed[0]),
            hasTokenInfo: !!parsed[0].tokenInfo,
            hasThreadId: !!parsed[0].threadId,
            hasRawRequest: !!parsed[0].rawRequest
          } : null
        });
        setMessages(parsed);
      } catch (error) {
        logger.error('Failed to parse stored messages:', error);
        setMessages([]);
      }
    }
  }, [setMessages]);

  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      console.log('Saving messages to localStorage:', {
        count: messages.length,
        sampleMessage: messages[0] ? {
          id: messages[0].id,
          keys: Object.keys(messages[0]),
          hasTokenInfo: !!messages[0].tokenInfo,
          hasThreadId: !!messages[0].threadId,
          hasRawRequest: !!messages[0].rawRequest
        } : null
      });
      
      // Preserve ALL message fields in localStorage
      const enhancedMessages = messages.map(msg => {
        const stored: any = {
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp
        };
        
        // Preserve ALL optional fields
        if (msg.pending !== undefined) stored.pending = msg.pending;
        if (msg.source !== undefined) stored.source = msg.source;
        if (msg.isLoading !== undefined) stored.isLoading = msg.isLoading;
        if (msg.rawRequest !== undefined) stored.rawRequest = msg.rawRequest;
        if (msg.rawResponse !== undefined) stored.rawResponse = msg.rawResponse;
        if (msg.tokenInfo !== undefined) stored.tokenInfo = msg.tokenInfo;
        if (msg.threadId !== undefined) stored.threadId = msg.threadId;
        if (msg.metadata !== undefined) stored.metadata = msg.metadata;
        if (msg.tokens !== undefined) stored.tokens = msg.tokens;
        
        return stored;
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enhancedMessages));
    }
  }, [messages]);

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return { clearStorage };
};
