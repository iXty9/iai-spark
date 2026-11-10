// Contacts tool for n8n (CMS v2): contact, tag and task reads and writes.
// Caller identity comes solely from the signed actor note minted by chat-relay.
// Writes need the user's confirmation in a later chat message unless the user
// turned confirmations off (profiles.ghl_skip_write_confirmations).
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders as baseCors } from '../_shared/cors.ts';
import { ACTOR_HEADER, verifyActor } from '../_shared/ixty-actor.ts';
import {
  buildGhlRequest, describeWrite, failure, HIGH_RISK_OPERATIONS, httpStatusFor, isWrite, normalizeResponse, parseRequest,
  type Command, type TypedResult,
} from '../_shared/ghl-contacts-core.ts';
import { changeHash, checkConfirmation, CONFIRMATION_TTL_S } from '../_shared/ghl-write-confirm-core.ts';
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

type Gate = { run: true; confirmationId: string | null } | { run: false; result: TypedResult };

/** Decide whether a write may run now, or store/return a pending confirmation. */
async function gateWrite(
  supabase: SupabaseClient, cmd: Command, confirmationId: string | null,
  actor: { sub: string; inst: string; iat: number }, requestId: string,
): Promise<Gate> {
  const op = cmd.operation;
  const { data: profile, error: pErr } = await supabase
    .from('profiles').select('ghl_skip_write_confirmations').eq('id', actor.sub).maybeSingle();
  if (pErr) return { run: false, result: failure(op, requestId, 'UPSTREAM_UNAVAILABLE', null, true) };
  if (profile?.ghl_skip_write_confirmations === true) return { run: true, confirmationId: null };

  const paramsHash = await changeHash(op, cmd.params);
  const nowIso = new Date().toISOString();
  const { data: pending, error: cErr } = await supabase
    .from('ghl_write_confirmations')
    .select('id, user_id, installation_id, operation, params_hash, actor_iat, expires_at, consumed_at')
    .eq('user_id', actor.sub).eq('installation_id', actor.inst).eq('operation', op).eq('params_hash', paramsHash)
    .is('consumed_at', null).gt('expires_at', nowIso)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (cErr) return { run: false, result: failure(op, requestId, 'UPSTREAM_UNAVAILABLE', null, true) };

  if (confirmationId && pending?.id !== confirmationId) {
    return { run: false, result: failure(op, requestId, 'CONFIRMATION_INVALID', null, false) };
  }

  const summary = describeWrite(cmd);
  const risk = HIGH_RISK_OPERATIONS.includes(op) ? 'high' : 'normal';

  if (pending) {
    const check = checkConfirmation(pending, { sub: actor.sub, inst: actor.inst, actorIat: actor.iat, operation: op, paramsHash, nowMs: Date.now() });
    if (check.ok) {
      // Consume atomically so a confirmation runs at most once.
      const { data: used } = await supabase.from('ghl_write_confirmations')
        .update({ consumed_at: nowIso }).eq('id', pending.id).is('consumed_at', null).select('id').maybeSingle();
      if (!used) return { run: false, result: failure(op, requestId, 'CONFIRMATION_INVALID', null, false) };
      return { run: true, confirmationId: pending.id };
    }
    // Same message as the proposal: still waiting for the user.
    return { run: false, result: failure(op, requestId, 'CONFIRMATION_REQUIRED', null, false, { confirmation_id: pending.id, summary, risk, expires_at: pending.expires_at }) };
  }

  const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_S * 1000).toISOString();
  const { data: created, error: iErr } = await supabase.from('ghl_write_confirmations').insert({
    user_id: actor.sub, installation_id: actor.inst, operation: op, params_hash: paramsHash,
    summary, actor_iat: actor.iat, expires_at: expiresAt,
  }).select('id').single();
  if (iErr || !created) return { run: false, result: failure(op, requestId, 'UPSTREAM_UNAVAILABLE', null, true) };
  return { run: false, result: failure(op, requestId, 'CONFIRMATION_REQUIRED', null, false, { confirmation_id: created.id, summary, risk, expires_at: expiresAt }) };
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
    const { sub, inst, loc, iat } = verified.claims;

    let raw: unknown;
    try { raw = await req.json(); } catch { raw = null; }
    const parsed = parseRequest(raw);
    if (!parsed) return reply(failure(null, requestId, 'INVALID_REQUEST', null, false));
    const cmd = parsed.command;

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

    let confirmationId: string | null = null;
    if (isWrite(cmd.operation)) {
      const gate = await gateWrite(supabase, cmd, parsed.confirmation_id, { sub, inst, iat }, requestId);
      if (!gate.run) {
        console.info(`[ghl-contacts] ${cmd.operation} user ${sub.slice(0, 8)} -> ${gate.result.error?.code}`);
        return reply(gate.result);
      }
      confirmationId = gate.confirmationId;
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
    console.info(`[ghl-contacts] ${cmd.operation} user ${sub.slice(0, 8)}${confirmationId ? ` confirmed ${confirmationId.slice(0, 8)}` : ''} -> ${result.ok ? 'ok' : result.error?.code}`);
    return reply(result);
  } catch (e) {
    console.error('[ghl-contacts] unexpected error:', (e as Error)?.message);
    return reply(failure(null, requestId, 'UPSTREAM_UNAVAILABLE', null, true), 500);
  }
});
