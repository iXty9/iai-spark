
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
    
    // Create enhanced storage format that preserves all fields
    const enhancedMessages = limitedMessages.map(msg => ({
      id: msg.id,
      content: msg.content,
      sender: msg.sender,
      timestamp: msg.timestamp.toISOString(), // Store as ISO string for localStorage
      ...(msg.pending && { pending: msg.pending }),
      ...(msg.rawResponse && { rawResponse: msg.rawResponse }),
      ...(msg.tokenInfo && { tokenInfo: msg.tokenInfo }),
      ...(msg.threadId && { threadId: msg.threadId }),
      ...(msg.metadata && { metadata: msg.metadata })
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enhancedMessages));
    logger.debug('Enhanced chat history saved to localStorage', { 
      messageCount: limitedMessages.length,
      hasTokenInfo: limitedMessages.some(m => m.tokenInfo),
      hasRawResponse: limitedMessages.some(m => m.rawResponse)
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
            timestamp: new Date(item.timestamp)
          };
          
          // Restore optional enhanced fields
          if (item.pending !== undefined) {
            message.pending = item.pending;
          }
          
          if (item.rawResponse) {
            message.rawResponse = item.rawResponse;
          }
          
          if (item.tokenInfo) {
            message.tokenInfo = item.tokenInfo;
          }
          
          if (item.threadId) {
            message.threadId = item.threadId;
          }
          
          if (item.metadata) {
            message.metadata = item.metadata;
          }
          
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
      hasTokenInfo: validMessages.some(m => m.tokenInfo),
      hasRawResponse: validMessages.some(m => m.rawResponse)
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
