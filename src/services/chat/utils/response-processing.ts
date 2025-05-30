import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';

/**
 * Processes metadata from webhook responses and adds it to the message
 */
export function processResponseMetadata(message: Message, data: any): void {
  // NOTE: rawResponse is already set in message-processor.ts, don't overwrite it here
  
  // Add metadata for debugging and data integrity
  message.metadata = {
    responseFormat: typeof data,
    responseStructure: Array.isArray(data) ? 'array' : (typeof data === 'object' ? 'object' : 'other'),
    webhookType: message.metadata?.webhookType || 'unknown',
    processedAt: new Date().toISOString()
  };
  
  // Handle token info - core business logic
  // Updated to handle the actual webhook response structure with correct field names
  if (Array.isArray(data) && data[0]?.usage) {
    const usage = data[0].usage;
    message.tokenInfo = {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens
    };
  } else if (data?.usage) {
    const usage = data.usage;
    message.tokenInfo = {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens
    };
  }
  
  // Handle thread info - core business logic
  if (Array.isArray(data) && data[0]?.threadId) {
    message.threadId = data[0].threadId;
  } else if (data?.threadId) {
    message.threadId = data.threadId;
  }
}

/**
 * Creates an error response message
 */
export function createErrorResponse(
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
