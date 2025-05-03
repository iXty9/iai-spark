
import { Message } from '@/types/chat';
import { emitDebugEvent } from '@/utils/debug-events';
import { parseWebhookResponse } from '@/utils/debug';
import { SendMessageParams } from '../types/messageTypes';
import { sendWebhookMessage } from '../webhook/webhookService';
import { logger } from '@/utils/logging';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sendMessage = async ({
  message,
  onMessageStart,
  onMessageStream,
  onMessageComplete,
  onError,
  isAuthenticated = false
}: SendMessageParams): Promise<Message & { cancel?: () => void }> => {
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
    
    // Create the initial user message - core business logic
    const userMessage: Message = {
      id: `user_${messageId}`,
      sender: 'user',
      content: message,
      timestamp: new Date(),
    };
    
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
    let accumulatedContent = '';
    if (onMessageStream) {
      // Simple streaming implementation
      const chunks = responseText.split(' ');
      for (const word of chunks) {
        if (canceled || (controller && controller.signal.aborted)) {
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
    logger.error('Error in sendMessage', error, { module: 'chat' });
    
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
};

// Helper function to process response metadata
function processResponseMetadata(message: Message, data: any): void {
  // Debug information - Stored only when needed
  if (process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && (window as any).__DEV_MODE_ENABLED__)) {
    // Store the raw response for debugging
    message.rawResponse = data;
    
    // Add metadata for debugging purposes
    message.metadata = {
      responseFormat: typeof data,
      responseStructure: Array.isArray(data) ? 'array' : (typeof data === 'object' ? 'object' : 'other'),
      webhookType: message.metadata?.webhookType || 'unknown'
    };
  }
  
  // Handle token info - core business logic
  if (Array.isArray(data) && data[0]?.usage) {
    message.tokenInfo = data[0].usage;
  } else if (data?.usage) {
    message.tokenInfo = data.usage;
  }
  
  // Handle thread info - core business logic
  if (Array.isArray(data) && data[0]?.threadId) {
    message.threadId = data[0].threadId;
  } else if (data?.threadId) {
    message.threadId = data.threadId;
  }
}

// Helper function to create error response
function createErrorResponse(
  error: unknown, 
  canceled: boolean, 
  controller: AbortController | null
): Message & { cancel?: () => void } {
  // Return an error message - core business logic
  const errorMessage: Message = {
    id: `error_${Date.now()}`,
    sender: 'ai' as 'ai', // Explicitly type this as 'ai' to match the Message type
    content: "I'm sorry, but I encountered an error processing your message. Please try again.",
    timestamp: new Date(),
    metadata: { 
      error: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }
  };
  
  // Add cancel function to the error message response
  const errorResponse: Message & { cancel?: () => void } = {
    ...errorMessage,
    cancel: () => {
      canceled = true;
      if (controller) {
        controller.abort();
        controller = null;
      }
    }
  };
  
  return errorResponse;
}
