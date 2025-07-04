import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';
import { WebhookResponse } from '@/types/webhook';

export const processResponseMetadata = (message: Message, webhookResponse: WebhookResponse | WebhookResponse[]): void => {
  logger.debug('Processing response metadata', {
    messageId: message.id,
    responseType: Array.isArray(webhookResponse) ? 'array' : 'object'
  }, { module: 'response-processing' });
  
  try {
    // Handle array response (your format)
    if (Array.isArray(webhookResponse) && webhookResponse.length > 0) {
      const firstResponse = webhookResponse[0];
      
      if (firstResponse.threadId) {
        message.threadId = firstResponse.threadId;
        logger.debug('Set threadId from array response', { threadId: firstResponse.threadId }, { module: 'response-processing' });
      }
      
      if (firstResponse.usage) {
        message.tokenInfo = {
          promptTokens: firstResponse.usage.prompt_tokens,
          completionTokens: firstResponse.usage.completion_tokens,
          totalTokens: firstResponse.usage.total_tokens
        };
        logger.debug('Set tokenInfo from array response', message.tokenInfo, { module: 'response-processing' });
      }
    }
    // Handle direct object response
    else if (webhookResponse && typeof webhookResponse === 'object' && !Array.isArray(webhookResponse)) {
      if (webhookResponse.threadId) {
        message.threadId = webhookResponse.threadId;
        logger.debug('Set threadId from object response', { threadId: webhookResponse.threadId }, { module: 'response-processing' });
      }
      
      if (webhookResponse.usage) {
        message.tokenInfo = {
          promptTokens: webhookResponse.usage.prompt_tokens,
          completionTokens: webhookResponse.usage.completion_tokens,
          totalTokens: webhookResponse.usage.total_tokens
        };
        logger.debug('Set tokenInfo from object response', message.tokenInfo, { module: 'response-processing' });
      }
    }
    
    logger.debug('Response metadata processing complete', {
      messageId: message.id,
      hasTokenInfo: !!message.tokenInfo,
      hasThreadId: !!message.threadId
    }, { module: 'response-processing' });
    
  } catch (error) {
    logger.error('Error processing response metadata', error, { module: 'response-processing' });
  }
};

export const createErrorResponse = (error: unknown, canceled: boolean, controller: AbortController | null): Message => {
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