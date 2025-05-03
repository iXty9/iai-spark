
import { SendMessageParams } from '../types/messageTypes';
import { processMessage } from './message-processor';

/**
 * Main entry point for sending messages to the chat service
 */
export const sendMessage = async (params: SendMessageParams) => {
  return processMessage(params);
};
