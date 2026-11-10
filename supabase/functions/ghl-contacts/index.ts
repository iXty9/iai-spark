// Contacts read tool for n8n: contacts.search and contacts.get only.
// Caller identity comes solely from the signed actor note minted by chat-relay.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders as baseCors } from '../_shared/cors.ts';
import { ACTOR_HEADER, verifyActor } from '../_shared/ixty-actor.ts';
import { buildGhlRequest, failure, httpStatusFor, normalizeResponse, parseCommand, type TypedResult } from '../_shared/ghl-contacts-core.ts';
import { getValidAccessToken } from '../_shared/ghl-token-manager.ts';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const corsHeaders = { ...baseCors, 'Access-Control-Allow-Headers': `${baseCors['Access-Control-Allow-Headers']}, ${ACTOR_HEADER}` };

function reply(result: TypedResult, status?: number): Response {
  const code = result.error?.code;
  return new Response(JSON.stringify(result), {
    status: status ?? (result.ok ? 200 : httpStatusFor(code || '')),
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  if (req.method !== 'POST') return reply(failure(null, requestId, 'INVALID_REQUEST', null, false), 405);

  try {
    const verified = await verifyActor(req.headers.get(ACTOR_HEADER), Deno.env.get('IXTY_ACTOR_SIGNING_SECRET'));
    if (!verified.ok) {
      console.warn(`[ghl-contacts] actor rejected: ${verified.reason}`);
      if (verified.reason === 'config') return reply(failure(null, requestId, 'UPSTREAM_UNAVAILABLE', null, false), 500);
      return reply(failure(null, requestId, 'AUTHENTICATION_FAILED', null, false));
    }
    const { sub, inst, loc } = verified.claims;

    let raw: unknown;
    try { raw = await req.json(); } catch { raw = null; }
    const cmd = parseCommand(raw);
    if (!cmd) return reply(failure(null, requestId, 'INVALID_REQUEST', null, false));

    if (!inst || !loc) return reply(failure(cmd.operation, requestId, 'NO_CONNECTED_ACCOUNT', null, false));

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });

    // Re-check the connection now: same user, same sub-account, still connected.
    const { data: installation, error } = await supabase
      .from('ghl_installations')
      .select('id, user_id, location_id, connection_status')
      .eq('id', inst)
      .maybeSingle();
    if (error) {
      console.error('[ghl-contacts] installation lookup failed:', error.message);
      return reply(failure(cmd.operation, requestId, 'UPSTREAM_UNAVAILABLE', null, true), 500);
    }
    if (!installation || installation.user_id !== sub || installation.location_id !== loc || installation.connection_status !== 'connected') {
      console.warn(`[ghl-contacts] connection mismatch for user ${sub.slice(0, 8)}`);
      return reply(failure(cmd.operation, requestId, 'ACCESS_DENIED', null, false));
    }

    const token = await getValidAccessToken(supabase, installation.id, { source: 'contacts' });
    if (!token.ok) {
      console.error(`[ghl-contacts] token unavailable: ${token.reason}`);
      return reply(failure(cmd.operation, requestId, 'TOKEN_UNAVAILABLE', null, token.reason === 'busy'));
    }

    const ghl = buildGhlRequest(cmd, loc);
    let res: Response;
    try {
      res = await fetch(`${GHL_BASE_URL}${ghl.path}`, {
        method: ghl.method,
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
        body: ghl.body ? JSON.stringify(ghl.body) : undefined,
      });
    } catch (e) {
      console.error('[ghl-contacts] transport error:', (e as Error)?.name);
      return reply(failure(cmd.operation, requestId, 'TRANSPORT_ERROR', null, true));
    }

    if (res.status >= 300 && res.status < 400) {
      return reply(failure(cmd.operation, requestId, 'TRANSPORT_ERROR', res.status, false));
    }
    const text = await res.text();
    let body: unknown = null;
    try { body = JSON.parse(text); } catch { body = null; }
    if (!res.ok) console.warn(`[ghl-contacts] HighLevel ${res.status}: ${text.slice(0, 300)}`);

    const result = normalizeResponse(res.status, body, cmd, loc, requestId);
    console.info(`[ghl-contacts] ${cmd.operation} user ${sub.slice(0, 8)} -> ${result.ok ? 'ok' : result.error?.code}`);
    return reply(result);
  } catch (e) {
    console.error('[ghl-contacts] unexpected error:', (e as Error)?.message);
    return reply(failure(null, requestId, 'UPSTREAM_UNAVAILABLE', null, true), 500);
  }
});
