
import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';

const STORAGE_KEY = 'ixty_chat_history';
const MAX_MESSAGES = 100; // Prevent too large storage

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

    const parsedHistory = JSON.parse(savedHistory) as Message[];
    
    // Convert string dates back to Date objects
    const messagesWithFixedDates = parsedHistory.map(message => ({
      ...message,
      timestamp: new Date(message.timestamp)
    }));
    
    logger.debug('Chat history loaded from localStorage', { messageCount: messagesWithFixedDates.length }, { module: 'storage' });
    return messagesWithFixedDates;
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
