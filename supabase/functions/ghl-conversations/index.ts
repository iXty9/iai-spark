// Conversations tool for n8n (CMS v2). Identity comes solely from the signed
// actor note. Writes (including sending messages) pass the confirmation gate,
// and every contact/conversation is verified as belonging to the user's own
// sub-account before anything is changed or sent.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders as baseCors } from '../_shared/cors.ts';
import { ACTOR_HEADER, verifyActor } from '../_shared/ixty-actor.ts';
import {
  buildGhlRequest, describeWrite, HIGH_RISK_OPERATIONS, isWrite, normalizeResponse, ownershipCheck, parseRequest, recipientLabel,
  type Operation,
} from '../_shared/ghl-conversations-core.ts';
import { gateWrite } from '../_shared/ghl-write-gate.ts';
import { getValidAccessToken } from '../_shared/ghl-token-manager.ts';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const CONVERSATIONS_VERSION = '2021-04-15';
const CONTACTS_VERSION = '2021-07-28';
const corsHeaders = { ...baseCors, 'Access-Control-Allow-Headers': `${baseCors['Access-Control-Allow-Headers']}, ${ACTOR_HEADER}` };

const MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'The conversations request was not valid.',
  AUTHENTICATION_FAILED: 'The request could not be verified as coming from a signed-in user.',
  NO_CONNECTED_ACCOUNT: 'This user has no connected HighLevel sub-account.',
  ACCESS_DENIED: 'Access to this sub-account was denied.',
  NOT_FOUND: 'The conversation or contact was not found in this sub-account.',
  RATE_LIMITED: 'HighLevel is rate limiting requests. Try again shortly.',
  UPSTREAM_UNAVAILABLE: 'HighLevel is not available right now.',
  UPSTREAM_REQUEST_REJECTED: 'HighLevel rejected the request.',
  TENANT_MISMATCH: 'HighLevel returned data for a different sub-account.',
  INVALID_RESPONSE: 'HighLevel returned an unexpected response.',
  TRANSPORT_ERROR: 'Could not reach HighLevel.',
  TOKEN_UNAVAILABLE: 'The HighLevel connection could not be used right now.',
  CONFIRMATION_REQUIRED: 'Nothing was changed or sent yet. Show the user data.summary and ask them to confirm. If they confirm in their next message, call again with the same operation and params.',
  CONFIRMATION_INVALID: 'That confirmation is expired, already used, or does not match this change. Ask the user again.',
};
const STATUS: Record<string, number> = {
  INVALID_REQUEST: 400, AUTHENTICATION_FAILED: 401, NO_CONNECTED_ACCOUNT: 403, ACCESS_DENIED: 403, NOT_FOUND: 404,
  CONFIRMATION_REQUIRED: 409, CONFIRMATION_INVALID: 409, RATE_LIMITED: 429, TOKEN_UNAVAILABLE: 503,
};

function reply(op: Operation | null, requestId: string, result: { ok: true; data: unknown } | { ok: false; code: string; retryable?: boolean; status?: number | null; data?: unknown }, httpStatus?: number): Response {
  const body = result.ok
    ? { schema_version: '1.0', ok: true, operation: op, request_id: requestId, data: result.data, error: null }
    : { schema_version: '1.0', ok: false, operation: op, request_id: requestId, data: result.data ?? null,
        error: { code: result.code, message: MESSAGES[result.code] || 'CRM operation failed.', retryable: !!result.retryable, status: result.status ?? null } };
  return new Response(JSON.stringify(body), {
    status: httpStatus ?? (result.ok ? 200 : STATUS[result.code] ?? 502),
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function ghlFetch(token: string, version: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${GHL_BASE_URL}${path}`, {
    method, redirect: 'manual', signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', Version: version },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  if (req.method !== 'POST') return reply(null, requestId, { ok: false, code: 'INVALID_REQUEST' }, 405);

  try {
    const verified = await verifyActor(req.headers.get(ACTOR_HEADER), Deno.env.get('IXTY_ACTOR_SIGNING_SECRET'));
    if (!verified.ok) {
      console.warn(`[ghl-conversations] actor rejected: ${verified.reason}`);
      return reply(null, requestId, { ok: false, code: verified.reason === 'config' ? 'UPSTREAM_UNAVAILABLE' : 'AUTHENTICATION_FAILED' }, verified.reason === 'config' ? 500 : undefined);
    }
    const { sub, inst, loc, iat } = verified.claims;

    let raw: unknown;
    try { raw = await req.json(); } catch { raw = null; }
    const parsed = parseRequest(raw);
    if (!parsed) return reply(null, requestId, { ok: false, code: 'INVALID_REQUEST' });
    const cmd = parsed.command;
    const op = cmd.operation;
    if (!inst || !loc) return reply(op, requestId, { ok: false, code: 'NO_CONNECTED_ACCOUNT' });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: installation, error } = await supabase
      .from('ghl_installations').select('id, user_id, location_id, connection_status').eq('id', inst).maybeSingle();
    if (error) return reply(op, requestId, { ok: false, code: 'UPSTREAM_UNAVAILABLE', retryable: true }, 500);
    if (!installation || installation.user_id !== sub || installation.location_id !== loc || installation.connection_status !== 'connected') {
      return reply(op, requestId, { ok: false, code: 'ACCESS_DENIED' });
    }

    const token = await getValidAccessToken(supabase, installation.id, { source: 'conversations' });
    if (!token.ok) return reply(op, requestId, { ok: false, code: 'TOKEN_UNAVAILABLE', retryable: token.reason === 'busy' });

    // Prove the target belongs to this sub-account before acting on it.
    let recipient: string | undefined;
    const own = ownershipCheck(cmd);
    if (own) {
      const r = own.kind === 'contact'
        ? await ghlFetch(token.accessToken, CONTACTS_VERSION, 'GET', `/contacts/${own.id}`)
        : await ghlFetch(token.accessToken, CONVERSATIONS_VERSION, 'GET', `/conversations/${own.id}`);
      if (r.status === 404 || r.status === 400) return reply(op, requestId, { ok: false, code: 'NOT_FOUND', status: r.status });
      if (r.status < 200 || r.status >= 300) return reply(op, requestId, { ok: false, code: r.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_UNAVAILABLE', retryable: true, status: r.status });
      const j = r.json as any;
      const obj = own.kind === 'contact' ? j?.contact : (j?.conversation ?? j);
      if (!obj || obj.id !== own.id) return reply(op, requestId, { ok: false, code: 'INVALID_RESPONSE', status: r.status });
      if (obj.locationId !== loc) return reply(op, requestId, { ok: false, code: 'TENANT_MISMATCH', status: r.status });
      if (own.kind === 'contact') recipient = recipientLabel(obj, (cmd.params as any).type);
    }

    if (isWrite(op)) {
      const gate = await gateWrite(supabase, {
        operation: op, params: cmd.params, summary: describeWrite(cmd, recipient),
        risk: HIGH_RISK_OPERATIONS.includes(op) ? 'high' : 'normal',
      }, parsed.confirmation_id, { sub, inst, iat });
      if (!gate.run) {
        console.info(`[ghl-conversations] ${op} user ${sub.slice(0, 8)} -> ${gate.code}`);
        return reply(op, requestId, { ok: false, code: gate.code, retryable: gate.code === 'UPSTREAM_UNAVAILABLE', data: gate.data });
      }
    }

    const g = buildGhlRequest(cmd, loc);
    let r;
    try {
      r = await ghlFetch(token.accessToken, CONVERSATIONS_VERSION, g.method, g.path, g.body);
    } catch (e) {
      console.error('[ghl-conversations] transport error:', (e as Error)?.name);
      return reply(op, requestId, { ok: false, code: 'TRANSPORT_ERROR', retryable: true });
    }
    if (r.status >= 300 && r.status < 400) return reply(op, requestId, { ok: false, code: 'TRANSPORT_ERROR', status: r.status });
    if (r.status >= 400) console.warn(`[ghl-conversations] HighLevel ${r.status}: ${r.text.slice(0, 300)}`);
    const result = normalizeResponse(r.status, r.json, cmd, loc);
    console.info(`[ghl-conversations] ${op} user ${sub.slice(0, 8)} -> ${result.ok ? 'ok' : result.code}`);
    return reply(op, requestId, result);
  } catch (e) {
    console.error('[ghl-conversations] unexpected error:', (e as Error)?.message);
    return reply(null, requestId, { ok: false, code: 'UPSTREAM_UNAVAILABLE', retryable: true }, 500);
  }
});
