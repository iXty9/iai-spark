import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';

export interface ChatRelayBody {
  message: string;
  images?: Array<{ name: string; mime: string; data: string; size?: number }>;
  data?: Array<{ name: string; mime: string; data: string; size?: number }>;
  location?: { latitude: number; longitude: number } | null;
  recall?: { enabled: boolean; selected_datetime: string | null } | null;
  sessionCall?: number;
}

/**
 * Send a signed-in chat message through the chat-relay backend function.
 * The relay checks the sign-in, picks the n8n address and adds identity on the server.
 */
export async function sendViaChatRelay(body: ChatRelayBody, signal: AbortSignal): Promise<any> {
  const { data, error } = await supabase.functions.invoke('chat-relay', { body, signal });
  if (error) {
    let details = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const parsed = await error.context.json();
        details = parsed?.code ? `${parsed.code}${parsed.status ? ` (${parsed.status})` : ''}` : details;
      } catch {
        /* keep message */
      }
    }
    logger.error('[ChatRelay] request failed', { details }, { module: 'webhook' });
    throw new Error(`Chat relay failed: ${details}`);
  }
  return data;
}
