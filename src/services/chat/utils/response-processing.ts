
import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';

export const processResponseMetadata = (message: Message, webhookResponse: any): void => {
  console.log('=== processResponseMetadata DEBUG ===');
  console.log('Input message:', {
    id: message.id,
    keys: Object.keys(message)
  });
  console.log('Webhook response:', webhookResponse);
  
  try {
    // Handle array response (your format)
    if (Array.isArray(webhookResponse) && webhookResponse.length > 0) {
      const firstResponse = webhookResponse[0];
      console.log('Processing array response:', firstResponse);
      
      if (firstResponse.threadId) {
        message.threadId = firstResponse.threadId;
        console.log('Set threadId:', firstResponse.threadId);
      }
      
      if (firstResponse.usage) {
        message.tokenInfo = {
          promptTokens: firstResponse.usage.prompt_tokens,
          completionTokens: firstResponse.usage.completion_tokens,
          totalTokens: firstResponse.usage.total_tokens
        };
        console.log('Set tokenInfo:', message.tokenInfo);
      }
    }
    // Handle direct object response
    else if (webhookResponse && typeof webhookResponse === 'object') {
      console.log('Processing object response:', webhookResponse);
      
      if (webhookResponse.threadId) {
        message.threadId = webhookResponse.threadId;
        console.log('Set threadId:', webhookResponse.threadId);
      }
      
      if (webhookResponse.usage) {
        message.tokenInfo = {
          promptTokens: webhookResponse.usage.prompt_tokens,
          completionTokens: webhookResponse.usage.completion_tokens,
          totalTokens: webhookResponse.usage.total_tokens
        };
        console.log('Set tokenInfo:', message.tokenInfo);
      }
    }
    
    console.log('Final message after processing:', {
      id: message.id,
      keys: Object.keys(message),
      hasTokenInfo: !!message.tokenInfo,
      hasThreadId: !!message.threadId,
      tokenInfo: message.tokenInfo,
      threadId: message.threadId
    });
    console.log('=== END processResponseMetadata DEBUG ===');
    
  } catch (error) {
    logger.error('Error processing response metadata:', error);
    console.log('Error in processResponseMetadata:', error);
  }
};

export const createErrorResponse = (error: any, canceled: boolean, controller: AbortController | null): Message => {
  const errorMessage: Message = {
    id: `error_${Date.now()}`,
    sender: 'ai',
    content: canceled ? 
      "Message sending was canceled." : 
      "I'm sorry, but I encountered an error processing your message. Please try again.",
    timestamp: new Date().toISOString(),
    metadata: { 
      error: true, 
      canceled,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }
  };

  return errorMessage;
};
