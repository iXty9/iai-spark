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
}

export async function sendHermesMessage(
  params: { messages: HermesMessage[]; signal?: AbortSignal },
): Promise<HermesResult> {
  try {
    const { data, error } = await supabase.functions.invoke('hermes-chat', {
      body: { messages: params.messages, stream: false },
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
      return {
        ok: false,
        errorCode: payload?.code || 'invoke_error',
        errorMessage: payload?.error || error.message,
      };
    }

    if (data?.content != null) {
      return { ok: true, content: String(data.content) };
    }
    return { ok: false, errorCode: 'empty_response', errorMessage: 'Empty Hermes response' };
  } catch (err: any) {
    logger.error('Hermes provider error', err, { module: 'chat' });
    return { ok: false, errorCode: 'exception', errorMessage: err?.message || 'Unknown error' };
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
