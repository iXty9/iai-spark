
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

/**
 * Get the chat recall webhook URL from app settings
 */
async function getRecallWebhookUrl(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'chat_recall_webhook_url')
      .single();

    if (error || !data?.value) {
      return null;
    }

    return data.value;
  } catch (error) {
    logger.error('[RecallWebhook] Failed to get webhook URL:', error);
    return null;
  }
}

/**
 * Send a chat recall request to the backend
 * Returns 25 messages centered on the selected datetime
 */
export async function sendRecallRequest(
  userId: string,
  selectedDatetime: string,
  enabled: boolean
): Promise<RecallResponse | null> {
  const webhookUrl = await getRecallWebhookUrl();
  
  if (!webhookUrl) {
    logger.warn('[RecallWebhook] Chat recall webhook URL not configured');
    return null;
  }

  const authHeaders = await getWebhookAuthHeaders('chat_recall_webhook_url');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
  };

  const payload: RecallRequest = {
    user_id: userId,
    selected_datetime: selectedDatetime,
    enabled,
  };

  logger.info('[RecallWebhook] Sending recall request:', { 
    userId, 
    selectedDatetime, 
    enabled,
  });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.error('[RecallWebhook] Request failed:', { status: response.status });
      return null;
    }

    const data = await response.json();
    
    // Transform response to match our Message type
    const messages: Message[] = (data.messages || []).map((msg: any) => ({
      id: msg.id || msg.message_id || crypto.randomUUID(),
      content: msg.content || msg.message || '',
      sender: msg.sender || msg.role || 'ai',
      timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
      metadata: msg.metadata || {},
    }));

    logger.info('[RecallWebhook] Received response', { messageCount: messages.length });

    return {
      messages,
      selected_index: data.selected_index ?? Math.floor(messages.length / 2),
    };
  } catch (error) {
    logger.error('[RecallWebhook] Request error:', error);
    return null;
  }
}
