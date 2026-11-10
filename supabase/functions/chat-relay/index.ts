// Signed-in chat relay: checks the sign-in, picks the n8n address on the server,
// builds identity fields on the server and adds a short signed actor note.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders } from '../_shared/cors.ts';
import { ACTOR_HEADER, signActor, secretUsable } from '../_shared/ixty-actor.ts';
import { relayTimeoutMs, resolveTarget, type RelaySettings } from '../_shared/chat-relay-core.ts';

const AttachmentSchema = z.object({
  name: z.string().max(255),
  mime: z.string().max(150),
  data: z.string(),
  size: z.number().nonnegative().optional(),
}).strict();

const BodySchema = z.object({
  message: z.string().max(200_000),
  images: z.array(AttachmentSchema).max(10).optional(),
  data: z.array(AttachmentSchema).max(10).optional(),
  location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).nullable().optional(),
  recall: z.object({ enabled: z.boolean(), selected_datetime: z.string().max(64).nullable() }).nullable().optional(),
  sessionCall: z.number().int().nonnegative().optional(),
}).strict();

const SETTING_KEYS = [
  'authenticated_webhook_url',
  'anonymous_webhook_url',
  'authenticated_webhook_url_use_auth',
  'webhook_auth_header_name',
  'webhook_auth_header_value',
  'webhook_timeout',
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ code: 'method_not_allowed', error: 'POST only' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ code: 'unauthorized', error: 'Missing authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authed = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await authed.auth.getUser();
    if (authError || !user) return json({ code: 'unauthorized', error: 'Invalid session' }, 401);

    let raw: unknown;
    try { raw = await req.json(); } catch { return json({ code: 'invalid_body', error: 'Invalid JSON' }, 400); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return json({ code: 'invalid_body', error: parsed.error.flatten().fieldErrors }, 400);
    const input = parsed.data;

    const signingSecret = Deno.env.get('IXTY_ACTOR_SIGNING_SECRET');
    if (!secretUsable(signingSecret)) {
      console.error('[chat-relay] IXTY_ACTOR_SIGNING_SECRET missing or too short');
      return json({ code: 'misconfigured', error: 'Relay not configured' }, 500);
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    const [settingsRes, profileRes, ghlRes] = await Promise.all([
      admin.from('app_settings').select('key, value').in('key', SETTING_KEYS),
      admin.from('profiles')
        .select('username, first_name, webhook_url, custom_webhook_enabled, custom_webhook_use_auth, custom_webhook_auth_header_name, custom_webhook_auth_header_value')
        .eq('id', user.id).maybeSingle(),
      admin.from('ghl_installations')
        .select('id, location_id, location_name, company_id, company_name, connection_status')
        .eq('user_id', user.id).eq('connection_status', 'connected')
        .order('updated_at', { ascending: false }).limit(1),
    ]);
    if (settingsRes.error || profileRes.error) {
      console.error('[chat-relay] lookup failed:', settingsRes.error?.message || profileRes.error?.message);
      return json({ code: 'internal_error', error: 'Settings lookup failed' }, 500);
    }

    const settings: RelaySettings = {};
    for (const row of settingsRes.data || []) (settings as Record<string, string>)[row.key] = row.value;
    const profile = profileRes.data;

    const target = resolveTarget(settings, profile);
    if (!target.ok) {
      console.error(`[chat-relay] no usable target for user ${user.id.slice(0, 8)}: ${target.reason}`);
      return json({ code: target.reason, error: 'Chat address not allowed or not configured' }, 502);
    }

    const ghlRow = ghlRes.error ? null : (ghlRes.data?.[0] ?? null);
    const ghl = ghlRow?.location_id ? ghlRow : null;
    const actor = await signActor({ sub: user.id, inst: ghl?.id ?? null, loc: ghl?.location_id ?? null }, signingSecret);

    const sender = profile?.username || profile?.first_name || 'Authenticated User';
    const payload: Record<string, unknown> = {
      message: input.message,
      sender,
      timestamp: new Date().toISOString(),
      isAuthenticated: true,
      sessionCall: input.sessionCall ?? 0,
      user_id: user.id,
      sessionId: user.id,
    };
    if (input.images?.length) payload.images = input.images;
    if (input.data?.length) payload.data = input.data;
    if (input.location) payload.location = input.location;
    if (ghl) {
      payload.ghl = {
        location_id: ghl.location_id,
        location_name: ghl.location_name,
        company_id: ghl.company_id,
        company_name: ghl.company_name,
        connection_status: ghl.connection_status,
      };
    }
    if (input.recall?.enabled && input.recall.selected_datetime) payload.recall = input.recall;

    let upstream: Response;
    try {
      upstream = await fetch(target.url, {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.timeout(relayTimeoutMs(settings.webhook_timeout)),
        headers: { 'Content-Type': 'application/json', ...target.authHeaders, [ACTOR_HEADER]: actor },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      const name = (e as Error)?.name;
      console.error(`[chat-relay] upstream transport error: ${name}`);
      if (name === 'TimeoutError') return json({ code: 'upstream_timeout', error: 'Chat service timed out' }, 504);
      return json({ code: 'upstream_unreachable', error: 'Chat service unreachable' }, 502);
    }

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error(`[chat-relay] upstream ${upstream.status} (custom=${target.isCustom}): ${text.slice(0, 300)}`);
      return json({ code: 'upstream_error', status: upstream.status, error: `Chat service returned ${upstream.status}` }, 502);
    }
    try {
      JSON.parse(text);
    } catch {
      return json({ code: 'upstream_invalid', error: 'Chat service returned a non-JSON reply' }, 502);
    }
    return new Response(text, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[chat-relay] unexpected error:', (e as Error)?.message);
    return json({ code: 'internal_error', error: 'Unexpected error' }, 500);
  }
});
