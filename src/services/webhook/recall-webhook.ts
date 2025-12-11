
import { supabase } from '@/integrations/supabase/client';
import { getWebhookAuthHeaders } from './auth-header-builder';
import { logger } from '@/utils/logging';
import { Message } from '@/types/chat';

export interface RecallRequest {
  user_id: string;
  selected_datetime: string;
  enabled: boolean;
}

export interface RecallResponse {
  messages: Message[];
  selected_index: number;
}

export type RecallError = 
  | { type: 'not_configured'; message: string }
  | { type: 'network_error'; message: string }
  | { type: 'backend_error'; message: string; status?: number };

/**
 * Get the chat recall webhook URL from app settings
 */
async function getRecallWebhookUrl(): Promise<string | null> {
  try {
    logger.info('[RecallWebhook] Fetching webhook URL from app_settings...');
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'chat_recall_webhook_url')
      .maybeSingle();

    if (error) {
      logger.error('[RecallWebhook] Supabase query error:', { 
        code: error.code, 
        message: error.message,
        details: error.details 
      });
      return null;
    }

    if (!data?.value) {
      logger.warn('[RecallWebhook] No webhook URL configured in app_settings (key: chat_recall_webhook_url)');
      return null;
    }

    logger.info('[RecallWebhook] Retrieved webhook URL:', { url: data.value.substring(0, 50) + '...' });
    return data.value;
  } catch (error) {
    logger.error('[RecallWebhook] Unexpected error fetching webhook URL:', error);
    return null;
  }
}

/**
 * Send a chat recall request via the webhook-proxy-test edge function
 * This bypasses CORS by making the request server-side
 */
export async function sendRecallRequest(
  userId: string,
  selectedDatetime: string,
  enabled: boolean
): Promise<{ data: RecallResponse | null; error: RecallError | null }> {
  const webhookUrl = await getRecallWebhookUrl();
  
  if (!webhookUrl) {
    logger.warn('[RecallWebhook] Chat recall webhook URL not configured');
    return { 
      data: null, 
      error: { type: 'not_configured', message: 'Chat recall webhook URL not configured' }
    };
  }

  const authHeaders = await getWebhookAuthHeaders('chat_recall_webhook_url');
  
  const payload: RecallRequest = {
    user_id: userId,
    selected_datetime: selectedDatetime,
    enabled,
  };

  logger.info('[RecallWebhook] Sending recall request via proxy:', { 
    userId, 
    selectedDatetime, 
    enabled,
  });

  try {
    // Route through webhook-proxy-test edge function to bypass CORS
    const { data, error } = await supabase.functions.invoke('webhook-proxy-test', {
      body: {
        url: webhookUrl,
        method: 'POST',
        payload,
        headers: authHeaders,
        timeout: 30000
      }
    });

    if (error) {
      logger.error('[RecallWebhook] Proxy invocation error:', error);
      return { 
        data: null, 
        error: { type: 'network_error', message: error.message || 'Failed to reach webhook proxy' }
      };
    }

    if (!data.success) {
      logger.error('[RecallWebhook] Webhook request failed:', data);
      return { 
        data: null, 
        error: { 
          type: data.isTimeout ? 'network_error' : 'backend_error', 
          message: data.error || `HTTP ${data.status}: ${data.statusText}`,
          status: data.status
        }
      };
    }

    // Parse the response body from the proxy
    let responseData;
    try {
      responseData = data.body ? JSON.parse(data.body) : {};
    } catch {
      logger.warn('[RecallWebhook] Could not parse response body as JSON:', data.body);
      responseData = {};
    }
    
    // Handle both direct response format and n8n output wrapper format
    const rawMessages = responseData.messages || responseData.output?.messages || [];
    const selectedIndex = responseData.selected_index ?? responseData.output?.selected_index;

    logger.info('[RecallWebhook] Parsing response', { 
      format: responseData.output ? 'n8n-wrapped' : 'direct',
      rawMessageCount: rawMessages.length 
    });

    // Transform response to match our Message type
    const messages: Message[] = rawMessages.map((msg: any) => ({
      id: msg.id || msg.message_id || crypto.randomUUID(),
      content: msg.content || msg.message || '',
      sender: msg.sender || msg.role || 'ai',
      timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
      metadata: msg.metadata || {},
    }));

    logger.info('[RecallWebhook] Received response', { messageCount: messages.length });

    return {
      data: {
        messages,
        selected_index: selectedIndex ?? Math.floor(messages.length / 2),
      },
      error: null
    };
  } catch (error) {
    logger.error('[RecallWebhook] Request error:', error);
    return { 
      data: null, 
      error: { 
        type: 'network_error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}
