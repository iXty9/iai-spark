import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';

const STORAGE_KEY = 'ixty_chat_history';
const SCROLL_POSITION_KEY = 'ixty_chat_scroll_position';
const MAX_MESSAGES = 100; // Prevent too large storage

/**
 * Enhanced validation that checks for all message fields
 */
const isValidMessage = (message: any): boolean => {
  return (
    message &&
    typeof message === 'object' &&
    'id' in message &&
    'sender' in message &&
    'content' in message &&
    'timestamp' in message
  );
};

/**
 * Saves the current chat history to localStorage with enhanced data preservation
 */
export const saveChatHistory = (messages: Message[]): void => {
  try {
    // Only store a limited number of messages to prevent storage issues
    const limitedMessages = messages.slice(-MAX_MESSAGES);
    
    // Create enhanced storage format that preserves ALL fields including raw request/response
    const enhancedMessages = limitedMessages.map(msg => {
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
    
    logger.debug('Enhanced chat history saved to localStorage', { 
      messageCount: limitedMessages.length,
      hasTokenInfo: limitedMessages.filter(m => m.tokenInfo).length,
      hasRawRequest: limitedMessages.filter(m => m.rawRequest).length,
      hasRawResponse: limitedMessages.filter(m => m.rawResponse).length,
      hasThreadId: limitedMessages.filter(m => m.threadId).length
    }, { module: 'storage' });
  } catch (error) {
    logger.error('Failed to save chat history', error, { module: 'storage' });
  }
};

/**
 * Loads saved chat history from localStorage with enhanced data restoration
 */
export const loadChatHistory = (): Message[] => {
  try {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (!savedHistory) {
      return [];
    }

    let parsedHistory: any[];
    try {
      parsedHistory = JSON.parse(savedHistory);
      if (!Array.isArray(parsedHistory)) {
        logger.error('Chat history is not an array', null, { module: 'storage' });
        return [];
      }
    } catch (error) {
      logger.error('Failed to parse chat history', error, { module: 'storage' });
      return [];
    }
    
    // Validate and convert each message with enhanced field restoration
    const validMessages: Message[] = [];
    for (const item of parsedHistory) {
      try {
        if (isValidMessage(item)) {
          const message: Message = {
            id: item.id,
            content: item.content,
            sender: item.sender,
            timestamp: typeof item.timestamp === 'string' ? item.timestamp : new Date(item.timestamp).toISOString()
          };
          
          // Restore ALL optional enhanced fields
          if (item.pending !== undefined) message.pending = item.pending;
          if (item.source !== undefined) message.source = item.source;
          if (item.isLoading !== undefined) message.isLoading = item.isLoading;
          if (item.rawRequest !== undefined) message.rawRequest = item.rawRequest;
          if (item.rawResponse !== undefined) message.rawResponse = item.rawResponse;
          if (item.tokenInfo !== undefined) message.tokenInfo = item.tokenInfo;
          if (item.threadId !== undefined) message.threadId = item.threadId;
          if (item.metadata !== undefined) message.metadata = item.metadata;
          if (item.tokens !== undefined) message.tokens = item.tokens;
          
          validMessages.push(message);
        } else {
          logger.warn('Invalid message in chat history', { item }, { module: 'storage' });
        }
      } catch (error) {
        logger.error('Error processing message from history', error, { module: 'storage' });
      }
    }
    
    logger.debug('Enhanced chat history loaded from localStorage', { 
      messageCount: validMessages.length,
      hasTokenInfo: validMessages.filter(m => m.tokenInfo).length,
      hasRawRequest: validMessages.filter(m => m.rawRequest).length,
      hasRawResponse: validMessages.filter(m => m.rawResponse).length,
      hasThreadId: validMessages.filter(m => m.threadId).length
    }, { module: 'storage' });
    
    return validMessages;
  } catch (error) {
    logger.error('Failed to load chat history', error, { module: 'storage' });
    return [];
  }
};

/**
 * Clears the saved chat history from localStorage
 */
export const clearChatHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    clearScrollPosition();
    logger.debug('Chat history cleared from localStorage', null, { module: 'storage' });
  } catch (error) {
    logger.error('Failed to clear chat history', error, { module: 'storage' });
  }
};

/**
 * Saves the current scroll position to localStorage
 */
export const saveScrollPosition = (position: number): void => {
  try {
    localStorage.setItem(SCROLL_POSITION_KEY, position.toString());
    logger.debug('Scroll position saved', { position }, { module: 'storage' });
  } catch (error) {
    logger.error('Failed to save scroll position', error, { module: 'storage' });
  }
};

/**
 * Loads saved scroll position from localStorage
 */
export const loadScrollPosition = (): number | null => {
  try {
    const savedPosition = localStorage.getItem(SCROLL_POSITION_KEY);
    if (!savedPosition) {
      return null;
    }
    
    const position = parseInt(savedPosition, 10);
    logger.debug('Scroll position loaded', { position }, { module: 'storage' });
    return position;
  } catch (error) {
    logger.error('Failed to load scroll position', error, { module: 'storage' });
    return null;
  }
};

/**
 * Clears the saved scroll position from localStorage
 */
export const clearScrollPosition = (): void => {
  try {
    localStorage.removeItem(SCROLL_POSITION_KEY);
    logger.debug('Scroll position cleared', null, { module: 'storage' });
  } catch (error) {
    logger.error('Failed to clear scroll position', error, { module: 'storage' });
  }
};
