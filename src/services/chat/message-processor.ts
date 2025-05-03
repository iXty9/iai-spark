
import { Message } from '@/types/chat';
import { emitDebugEvent } from '@/utils/debug-events';
import { parseWebhookResponse } from '@/utils/debug';
import { logger } from '@/utils/logging';
import { sendWebhookMessage } from '../webhook/webhookService';
import { SendMessageParams } from '../types/messageTypes';
import { processResponseMetadata, createErrorResponse } from './utils/response-processing';
import { handleStreamingResponse } from './utils/streaming';

/**
 * Process a message and return the AI response
 */
export async function processMessage({
  message,
  onMessageStart,
  onMessageStream,
  onMessageComplete,
  onError,
  isAuthenticated = false
}: SendMessageParams): Promise<Message & { cancel?: () => void }> {
  let canceled = false;
  let controller: AbortController | null = new AbortController();
  
  try {
    logger.info('Processing message', { isAuthenticated }, { module: 'chat' });
    
    // Development/Debug only code
    emitDebugEvent({
      lastAction: 'API: Starting to process message',
      isLoading: true
    });
    
    // Generate a unique ID for this message - core business logic
    const messageId = `msg_${Date.now()}`;
    
    // Create the initial assistant message - core business logic
    const assistantMessage: Message = {
      id: messageId,
      sender: 'ai',
      content: '',
      timestamp: new Date(),
      pending: true,
    };
    
    // Notify that the message has started - core business logic
    if (onMessageStart) {
      onMessageStart(assistantMessage);
    }

    // Check if request was canceled - core business logic
    if (canceled) {
      // Debug only
      emitDebugEvent({
        lastAction: 'API: Message sending was canceled',
        isLoading: false
      });
      throw new Error('Message sending was canceled');
    }
    
    // Send message to webhook and get response - core business logic
    const data = await sendWebhookMessage(message, isAuthenticated);
    
    // Parse the response text
    let responseText;
    try {
      responseText = parseWebhookResponse(data);
      
      // Debug only
      emitDebugEvent({
        lastAction: `API: Successfully parsed webhook response`,
        isLoading: false
      });
    } catch (error) {
      logger.error('Failed to parse webhook response', error, { module: 'chat' });
      
      // Debug only
      emitDebugEvent({
        lastError: `API: Failed to parse webhook response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false
      });
      
      throw error;
    }
    
    // Process the actual webhook response for streaming - core business logic
    const accumulatedContent = await handleStreamingResponse(
      responseText, 
      onMessageStream, 
      canceled, 
      controller
    );
    
    // Update the assistant message with the full content from the webhook - core business logic
    assistantMessage.content = accumulatedContent.trim() || responseText;
    assistantMessage.pending = false;
    
    // Process metadata and debug information
    processResponseMetadata(assistantMessage, data);
    
    // Debug only
    emitDebugEvent({
      lastAction: 'API: Message from webhook completed successfully',
      isLoading: false
    });
    
    // Notify that the message is complete - core business logic
    if (onMessageComplete) {
      onMessageComplete(assistantMessage);
    }
    
    // Add cancel method to response
    const responseWithCancel = {
      ...assistantMessage,
      cancel: () => {
        canceled = true;
        if (controller) {
          controller.abort();
          controller = null;
        }
        
        // Debug only
        emitDebugEvent({
          lastAction: 'API: Message streaming was canceled by user',
          isLoading: false
        });
      }
    };
    
    return responseWithCancel;
  } catch (error) {
    logger.error('Error in processMessage', error, { module: 'chat' });
    
    // Debug only
    emitDebugEvent({
      lastError: error instanceof Error ? `API Error: ${error.message}` : 'Unknown API error',
      isLoading: false
    });
    
    if (onError && error instanceof Error) {
      onError(error);
    } else if (onError) {
      onError(new Error('Unknown error occurred'));
    }
    
    return createErrorResponse(error, canceled, controller);
  }
}
