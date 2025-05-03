
import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';

const STORAGE_KEY = 'ixty_chat_history';
const MAX_MESSAGES = 100; // Prevent too large storage

/**
 * Validates that a message object has the required fields
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
 * Saves the current chat history to localStorage
 */
export const saveChatHistory = (messages: Message[]): void => {
  try {
    // Only store a limited number of messages to prevent storage issues
    const limitedMessages = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedMessages));
    logger.debug('Chat history saved to localStorage', { messageCount: limitedMessages.length }, { module: 'storage' });
  } catch (error) {
    logger.error('Failed to save chat history', error, { module: 'storage' });
  }
};

/**
 * Loads saved chat history from localStorage
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
    
    // Validate and convert each message
    const validMessages: Message[] = [];
    for (const item of parsedHistory) {
      try {
        if (isValidMessage(item)) {
          // Convert string dates back to Date objects
          validMessages.push({
            ...item,
            timestamp: new Date(item.timestamp)
          });
        } else {
          logger.warn('Invalid message in chat history', { item }, { module: 'storage' });
        }
      } catch (error) {
        logger.error('Error processing message from history', error, { module: 'storage' });
      }
    }
    
    logger.debug('Chat history loaded from localStorage', { messageCount: validMessages.length }, { module: 'storage' });
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
    logger.debug('Chat history cleared from localStorage', null, { module: 'storage' });
  } catch (error) {
    logger.error('Failed to clear chat history', error, { module: 'storage' });
  }
};
