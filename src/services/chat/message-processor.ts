
import { Message } from '@/types/chat';
import { emitDebugEvent } from '@/utils/debug-events';
import { parseWebhookResponse } from '@/utils/debug/webhook-debug';
import { logger } from '@/utils/logging';
import { sendWebhookMessage } from '@/services/webhook';
import { sendHermesMessage, notifyHermesFallbackOnce } from '@/services/chat/providers/hermes-provider';
import { SendMessageParams } from '../types/messageTypes';
import { processResponseMetadata, createErrorResponse } from './utils/response-processing';
import { handleStreamingResponse } from './utils/streaming';

export async function processMessage({
  message,
  onMessageStart,
  onMessageStream,
  onMessageComplete,
  onError,
  isAuthenticated = false,
  userProfile = null,
  location = null,
  recall = null,
}: SendMessageParams): Promise<Message & { cancel?: () => void }> {
  let canceled = false;
  let controller = new AbortController();

  const debug = (payload: any) => emitDebugEvent({ isLoading: false, ...payload });

  try {
    logger.info('Processing message', { isAuthenticated }, { module: 'chat' });
    emitDebugEvent({ lastAction: 'API: Starting to process message', isLoading: true });

    const messageId = `msg_${Date.now()}`;
    const assistantMessage: Message & { cancel?: () => void } = {
      id: messageId,
      sender: 'ai',
      content: '',
      timestamp: new Date().toISOString(),
      pending: true,
      cancel: () => {
        canceled = true;
        controller.abort();
        debug({ lastAction: 'API: Message processing was canceled by user before completion' });
      }
    };

    onMessageStart?.(assistantMessage);

    if (canceled) {
      debug({ lastAction: 'API: Message sending was canceled' });
      throw new Error('Message sending was canceled');
    }

    // Hermes backend dispatch (additive; falls back to webhook on denial/failure)
    const useHermes = isAuthenticated && userProfile?.preferred_backend === 'hermes';
    if (useHermes) {
      const hermesMessages = [{ role: 'user' as const, content: message }];
      const hermesResult = await sendHermesMessage({
        messages: hermesMessages,
        signal: controller.signal,
      });
      if (hermesResult.ok && hermesResult.content != null) {
        const accumulated = await handleStreamingResponse(
          hermesResult.content,
          onMessageStream,
          canceled,
          controller,
        );
        Object.assign(assistantMessage, {
          content: (accumulated.trim() || hermesResult.content),
          pending: false,
          rawRequest: { provider: 'hermes', messages: hermesMessages },
          rawResponse: { provider: 'hermes', content: hermesResult.content },
        });
        debug({ lastAction: 'API: Hermes message completed successfully' });
        onMessageComplete?.(assistantMessage);
        return {
          ...assistantMessage,
          cancel: () => {
            canceled = true;
            controller.abort();
            debug({ lastAction: 'API: Hermes message streaming was canceled by user' });
          },
        };
      }
      // Denied or upstream failed: fall through to webhook with single toast
      logger.warn('Hermes unavailable, falling back to webhook', {
        code: hermesResult.errorCode,
      }, { module: 'chat' });
      notifyHermesFallbackOnce();
    }


    let webhookData, responseText;
    try {
      // Get both request and response from webhook
      webhookData = await sendWebhookMessage(message, isAuthenticated, userProfile, controller, location, recall);
      responseText = parseWebhookResponse(webhookData.response);
      debug({ lastAction: 'API: Successfully parsed webhook response' });
    } catch (error) {
      logger.error('Failed to parse webhook response', error, { module: 'chat' });
      debug({ lastError: `API: Failed to parse webhook response: ${error instanceof Error ? error.message : error}` });
      throw error;
    }

    const accumulatedContent = await handleStreamingResponse(
      responseText,
      onMessageStream,
      canceled,
      controller,
    );

    Object.assign(assistantMessage, {
      content: (accumulatedContent.trim() || responseText),
      pending: false,
      rawRequest: webhookData.request, // Store the complete outgoing payload
      rawResponse: webhookData.response, // Store the complete incoming response
    });

    processResponseMetadata(assistantMessage, webhookData.response);
    debug({ lastAction: 'API: Message from webhook completed successfully' });

    onMessageComplete?.(assistantMessage);

    // Add a .cancel method to response
    return {
      ...assistantMessage,
      cancel: () => {
        canceled = true;
        controller.abort();
        // Also cancel the webhook request if available
        if (webhookData?.cancel) {
          webhookData.cancel();
        }
        controller = null as any;
        debug({ lastAction: 'API: Message streaming was canceled by user' });
      },
    };
  } catch (error: any) {
    logger.error('Error in processMessage', error, { module: 'chat' });
    emitDebugEvent({
      lastError: error instanceof Error ? `API Error: ${error.message}` : 'Unknown API error',
      isLoading: false,
    });
    return createErrorResponse(error, canceled, controller);
  }
}
