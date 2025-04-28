
import { Message } from '@/types/chat';
import { emitDebugEvent } from '@/utils/debug-events';
import { parseWebhookResponse } from '@/utils/debug';
import { SendMessageParams } from './types/messageTypes';
import { sendWebhookMessage } from './webhook/webhookService';
import { logger } from '@/utils/logging';
export { exportChat } from './export/exportService';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sendMessage = async ({
  message,
  onMessageStart,
  onMessageStream,
  onMessageComplete,
  onError,
  isAuthenticated = false
}: SendMessageParams): Promise<Message> => {
  let canceled = false;
  
  try {
    logger.info('Processing message', { isAuthenticated }, { module: 'chat' });
    
    emitDebugEvent({
      lastAction: 'API: Starting to process message',
      isLoading: true
    });
    
    // Generate a unique ID for this message
    const messageId = `msg_${Date.now()}`;
    
    // Create the initial user message
    const userMessage: Message = {
      id: `user_${messageId}`,
      sender: 'user',
      content: message,
      timestamp: new Date(),
    };
    
    // Create the initial assistant message
    const assistantMessage: Message = {
      id: messageId,
      sender: 'ai',
      content: '',
      timestamp: new Date(),
      pending: true,
    };
    
    // Notify that the message has started
    if (onMessageStart) {
      onMessageStart(assistantMessage);
    }

    // Check if request was canceled
    if (canceled) {
      emitDebugEvent({
        lastAction: 'API: Message sending was canceled',
        isLoading: false
      });
      throw new Error('Message sending was canceled');
    }
    
    // Send message to webhook and get response
    const data = await sendWebhookMessage(message, isAuthenticated);
    
    // Parse the response text using our improved parser
    let responseText;
    try {
      responseText = parseWebhookResponse(data);
      
      emitDebugEvent({
        lastAction: `API: Successfully parsed webhook response`,
        isLoading: false
      });
    } catch (error) {
      logger.error('Failed to parse webhook response', error, { module: 'chat' });
      
      emitDebugEvent({
        lastError: `API: Failed to parse webhook response: ${error.message}`,
        isLoading: false
      });
      
      throw error;
    }
    
    // Process the actual webhook response for streaming
    let accumulatedContent = '';
    if (onMessageStream) {
      // Simple streaming implementation
      const chunks = responseText.split(' ');
      for (const word of chunks) {
        if (canceled) {
          throw new Error('Message streaming was canceled');
        }
        
        await delay(50); // Small delay for UI
        const chunk = word + ' ';
        accumulatedContent += chunk;
        onMessageStream(chunk);
      }
    } else {
      // If no streaming callback, just use the full response
      accumulatedContent = responseText;
    }
    
    // Update the assistant message with the full content from the webhook
    assistantMessage.content = accumulatedContent.trim() || responseText;
    assistantMessage.pending = false;
    
    // Store the raw response for debugging
    assistantMessage.rawResponse = data;
    
    // Add metadata for debugging purposes
    assistantMessage.metadata = {
      responseFormat: typeof data,
      responseStructure: Array.isArray(data) ? 'array' : (typeof data === 'object' ? 'object' : 'other'),
      webhookType: isAuthenticated ? 'authenticated' : 'anonymous'
    };
    
    // If there's token info, store it
    if (Array.isArray(data) && data[0]?.usage) {
      assistantMessage.tokenInfo = data[0].usage;
    } else if (data?.usage) {
      assistantMessage.tokenInfo = data.usage;
    }
    
    // If there's thread info, store it
    if (Array.isArray(data) && data[0]?.threadId) {
      assistantMessage.threadId = data[0].threadId;
    } else if (data?.threadId) {
      assistantMessage.threadId = data.threadId;
    }
    
    emitDebugEvent({
      lastAction: 'API: Message from webhook completed successfully',
      isLoading: false
    });
    
    // Notify that the message is complete
    if (onMessageComplete) {
      onMessageComplete(assistantMessage);
    }
    
    return assistantMessage;
    
  } catch (error) {
    logger.error('Error in sendMessage', error, { module: 'chat' });
    
    emitDebugEvent({
      lastError: error instanceof Error ? `API Error: ${error.message}` : 'Unknown API error',
      isLoading: false
    });
    
    if (onError && error instanceof Error) {
      onError(error);
    } else if (onError) {
      onError(new Error('Unknown error occurred'));
    }
    
    // Return an error message
    return {
      id: `error_${Date.now()}`,
      sender: 'ai',
      content: "I'm sorry, but I encountered an error processing your message. Please try again.",
      timestamp: new Date(),
      metadata: { 
        error: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
  
  // Cleanup function to allow for cancellation
  return {
    cancel: () => {
      canceled = true;
      emitDebugEvent({
        lastAction: 'API: Message sending was canceled by user',
        isLoading: false
      });
    }
  } as any;
};
