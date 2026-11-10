import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';

export interface HermesMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface HermesResult {
  ok: boolean;
  content?: string;
  errorCode?: string;
  errorMessage?: string;
  /** True when the server answered in continuity mode (errors must be shown, not masked). */
  continuity?: boolean;
  /** Generation token the reply belongs to (continuity mode). */
  conversationToken?: string;
}

// Opaque conversation token (never the Hermes session ID). Shared by tabs via the server.
let conversationToken: string | null = null;
export const getHermesConversationToken = () => conversationToken;

async function readError(error: any): Promise<any> {
  const ctx: any = error?.context;
  try {
    if (ctx && typeof ctx.json === 'function') return await ctx.json();
    if (ctx && typeof ctx.text === 'function') { const t = await ctx.text(); try { return JSON.parse(t); } catch { return null; } }
  } catch { /* ignore */ }
  return null;
}

let continuityNoticeShown = false;

export async function sendHermesMessage(
  params: { messages: HermesMessage[]; clientMessageId?: string; signal?: AbortSignal },
): Promise<HermesResult> {
  try {
    if (!conversationToken) {
      const st = await supabase.functions.invoke('hermes-chat', { body: { action: 'state' } });
      if (!st.error && st.data?.enabled && st.data?.conversation_token) conversationToken = st.data.conversation_token;
      else if (st.error) {
        const p = await readError(st.error);
        if (p?.continuity) return { ok: false, continuity: true, errorCode: p.code, errorMessage: p.error };
      }
    }
    const sentToken = conversationToken;
    const { data, error } = await supabase.functions.invoke('hermes-chat', {
      body: {
        messages: params.messages, stream: false,
        ...(sentToken ? { conversation_token: sentToken, client_message_id: params.clientMessageId } : {}),
      },
    });

    if (error) {
      // supabase-js wraps non-2xx responses as FunctionsHttpError; try to read structured body.
      const ctx: any = (error as any).context;
      let payload: any = null;
      try {
        if (ctx && typeof ctx.json === 'function') payload = await ctx.json();
        else if (ctx && typeof ctx.text === 'function') {
          const t = await ctx.text();
          try { payload = JSON.parse(t); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      if (payload?.conversation_token) conversationToken = payload.conversation_token;
      return {
        ok: false,
        continuity: !!payload?.continuity || !!sentToken,
        errorCode: payload?.code || 'invoke_error',
        errorMessage: payload?.error || error.message,
      };
    }

    if (data?.continuity_notice && !continuityNoticeShown) {
      continuityNoticeShown = true;
      toast({ title: 'Hermes memory is paused', description: 'Hermes is temporarily not keeping this conversation between messages.' });
    }
    if (data?.content != null) {
      return { ok: true, content: String(data.content), continuity: !!data.continuity, conversationToken: sentToken ?? undefined };
    }
    return { ok: false, errorCode: 'empty_response', errorMessage: 'Empty Hermes response' };
  } catch (err: any) {
    logger.error('Hermes provider error', err, { module: 'chat' });
    return { ok: false, errorCode: 'exception', errorMessage: err?.message || 'Unknown error' };
  }
}

/**
 * Acknowledged New Chat reset. Resolves true when the screen may be cleared:
 * either Hermes confirmed the new conversation, or Hermes isn't in use for this user.
 */
export async function resetHermesConversation(): Promise<boolean> {
  try {
    let token = conversationToken;
    if (!token) {
      const st = await supabase.functions.invoke('hermes-chat', { body: { action: 'state' } });
      if (st.error) {
        const p = await readError(st.error);
        return p?.code === 'hermes_not_selected' || p?.code === 'hermes_not_allowed';
      }
      if (!st.data?.enabled) return true;
      token = st.data.conversation_token;
    }
    const { data, error } = await supabase.functions.invoke('hermes-chat', { body: { action: 'reset', conversation_token: token } });
    if (error) {
      const p = await readError(error);
      if (p?.code === 'hermes_not_selected' || p?.code === 'hermes_not_allowed') return true;
      if (p?.code === 'stale_generation' && p?.conversation_token) {
        // Another tab moved on; retry once against the latest generation.
        conversationToken = p.conversation_token;
        const again = await supabase.functions.invoke('hermes-chat', { body: { action: 'reset', conversation_token: conversationToken } });
        if (!again.error && again.data?.conversation_token) { conversationToken = again.data.conversation_token; return true; }
      }
      return false;
    }
    if (data?.enabled === false) return true;
    if (data?.conversation_token) { conversationToken = data.conversation_token; return true; }
    return false;
  } catch (err: any) {
    logger.error('Hermes reset failed', err, { module: 'chat' });
    return false;
  }
}

// One toast per page session, only for the "not allowed" denial case.
let hermesNotAllowedWarned = false;
export function notifyHermesNotAllowedOnce() {
  if (hermesNotAllowedWarned) return;
  hermesNotAllowedWarned = true;
  toast({
    title: 'Hermes not enabled',
    description: 'Hermes is not enabled for this account yet. Using the standard webhook backend.',
  });
}
