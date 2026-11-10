// Shared request pipeline for ghl-* n8n tool functions (calendars, invoices…):
// verify the signed actor note → parse → re-check the installation → get the
// Location token → area-specific ownership checks (prepare) → confirmation
// gate for writes → run → typed schema 1.0 reply.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders as baseCors } from './cors.ts';
import { ACTOR_HEADER, verifyActor } from './ixty-actor.ts';
import { gateWrite } from './ghl-write-gate.ts';
import { getValidAccessToken } from './ghl-token-manager.ts';

export const corsHeaders = { ...baseCors, 'Access-Control-Allow-Headers': `${baseCors['Access-Control-Allow-Headers']}, ${ACTOR_HEADER}` };
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

const MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'The CRM request was not valid.',
  AUTHENTICATION_FAILED: 'The request could not be verified as coming from a signed-in user.',
  NO_CONNECTED_ACCOUNT: 'This user has no connected HighLevel sub-account.',
  ACCESS_DENIED: 'Access to this sub-account was denied.',
  NOT_FOUND: 'The item was not found in this sub-account.',
  RATE_LIMITED: 'HighLevel is rate limiting requests. Try again shortly.',
  UPSTREAM_UNAVAILABLE: 'HighLevel is not available right now.',
  UPSTREAM_REQUEST_REJECTED: 'HighLevel rejected the request.',
  TENANT_MISMATCH: 'HighLevel returned data for a different sub-account.',
  INVALID_RESPONSE: 'HighLevel returned an unexpected response.',
  TRANSPORT_ERROR: 'Could not reach HighLevel.',
  TOKEN_UNAVAILABLE: 'The HighLevel connection could not be used right now.',
  MISSING_HIGHLEVEL_USER: 'The connected HighLevel account has no user to send as. Reconnect HighLevel and try again.',
  CONFIRMATION_REQUIRED: 'Nothing was changed yet. Show the user data.summary and ask them to confirm. If they confirm in their next message, call again with the same operation and params.',
  CONFIRMATION_INVALID: 'That confirmation is expired, already used, or does not match this change. Ask the user again.',
};
const STATUS: Record<string, number> = {
  INVALID_REQUEST: 400, AUTHENTICATION_FAILED: 401, NO_CONNECTED_ACCOUNT: 403, ACCESS_DENIED: 403, NOT_FOUND: 404,
  CONFIRMATION_REQUIRED: 409, CONFIRMATION_INVALID: 409, MISSING_HIGHLEVEL_USER: 409, RATE_LIMITED: 429, TOKEN_UNAVAILABLE: 503,
};

export type Outcome =
  | { ok: true; data: unknown }
  | { ok: false; code: string; retryable?: boolean; status?: number | null; data?: unknown };

export interface GhlResponse { status: number; json: any; text: string }
export interface ToolContext {
  loc: string;
  installation: { id: string; ghl_user_id: string | null };
  ghl: (version: string, method: string, path: string, body?: unknown) => Promise<GhlResponse>;
}

export interface ToolSpec<C extends { operation: string; params: unknown }, P> {
  name: string;
  parse: (raw: unknown) => { command: C; confirmation_id: string | null } | null;
  isWrite: (op: string) => boolean;
  isHighRisk: (op: string) => boolean;
  /** Ownership checks and data needed for the summary. Return an Outcome to stop. */
  prepare: (ctx: ToolContext, cmd: C) => Promise<{ ok: true; prep: P } | Extract<Outcome, { ok: false }>>;
  describe: (cmd: C, prep: P) => string;
  run: (ctx: ToolContext, cmd: C, prep: P) => Promise<Outcome>;
}

/** Map a non-2xx HighLevel status to a typed failure. */
export function upstreamFailure(status: number): Extract<Outcome, { ok: false }> {
  const code = status === 401 ? 'AUTHENTICATION_FAILED' : status === 403 ? 'ACCESS_DENIED' : status === 404 ? 'NOT_FOUND'
    : status === 429 ? 'RATE_LIMITED' : status >= 500 ? 'UPSTREAM_UNAVAILABLE' : status >= 300 && status < 400 ? 'TRANSPORT_ERROR' : 'UPSTREAM_REQUEST_REJECTED';
  return { ok: false, code, retryable: status === 429 || status >= 500, status };
}

export function serveTool<C extends { operation: string; params: unknown }, P>(spec: ToolSpec<C, P>) {
  const reply = (op: string | null, requestId: string, r: Outcome, httpStatus?: number) => {
    const body = r.ok
      ? { schema_version: '1.0', ok: true, operation: op, request_id: requestId, data: r.data, error: null }
      : { schema_version: '1.0', ok: false, operation: op, request_id: requestId, data: r.data ?? null,
          error: { code: r.code, message: MESSAGES[r.code] || 'CRM operation failed.', retryable: !!r.retryable, status: r.status ?? null } };
    return new Response(JSON.stringify(body), {
      status: httpStatus ?? (r.ok ? 200 : STATUS[r.code] ?? 502),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  };

  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    const requestId = crypto.randomUUID();
    if (req.method !== 'POST') return reply(null, requestId, { ok: false, code: 'INVALID_REQUEST' }, 405);
    const tag = `[${spec.name}]`;
    try {
      const verified = await verifyActor(req.headers.get(ACTOR_HEADER), Deno.env.get('IXTY_ACTOR_SIGNING_SECRET'));
      if (!verified.ok) {
        console.warn(`${tag} actor rejected: ${verified.reason}`);
        return verified.reason === 'config'
          ? reply(null, requestId, { ok: false, code: 'UPSTREAM_UNAVAILABLE' }, 500)
          : reply(null, requestId, { ok: false, code: 'AUTHENTICATION_FAILED' });
      }
      const { sub, inst, loc, iat } = verified.claims;
      let raw: unknown;
      try { raw = await req.json(); } catch { raw = null; }
      const parsed = spec.parse(raw);
      if (!parsed) return reply(null, requestId, { ok: false, code: 'INVALID_REQUEST' });
      const cmd = parsed.command;
      const op = cmd.operation;
      if (!inst || !loc) return reply(op, requestId, { ok: false, code: 'NO_CONNECTED_ACCOUNT' });

      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
      const { data: installation, error } = await supabase
        .from('ghl_installations').select('id, user_id, location_id, connection_status, ghl_user_id').eq('id', inst).maybeSingle();
      if (error) return reply(op, requestId, { ok: false, code: 'UPSTREAM_UNAVAILABLE', retryable: true }, 500);
      if (!installation || installation.user_id !== sub || installation.location_id !== loc || installation.connection_status !== 'connected') {
        return reply(op, requestId, { ok: false, code: 'ACCESS_DENIED' });
      }
      const token = await getValidAccessToken(supabase, installation.id, { source: spec.name });
      if (!token.ok) return reply(op, requestId, { ok: false, code: 'TOKEN_UNAVAILABLE', retryable: token.reason === 'busy' });

      const ctx: ToolContext = {
        loc,
        installation: { id: installation.id, ghl_user_id: installation.ghl_user_id ?? null },
        ghl: async (version, method, path, body) => {
          const res = await fetch(`${GHL_BASE_URL}${path}`, {
            method, redirect: 'manual', signal: AbortSignal.timeout(15_000),
            headers: { Authorization: `Bearer ${token.accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json', Version: version },
            body: body ? JSON.stringify(body) : undefined,
          });
          const text = await res.text();
          let json: unknown = null;
          try { json = JSON.parse(text); } catch { json = null; }
          if (res.status >= 400) console.warn(`${tag} HighLevel ${res.status} ${method} ${path.split('?')[0]}: ${text.slice(0, 300)}`);
          return { status: res.status, json, text };
        },
      };

      const prep = await spec.prepare(ctx, cmd);
      if (!prep.ok) return reply(op, requestId, prep);

      if (spec.isWrite(op)) {
        const gate = await gateWrite(supabase, {
          operation: op, params: cmd.params, summary: spec.describe(cmd, prep.prep), risk: spec.isHighRisk(op) ? 'high' : 'normal',
        }, parsed.confirmation_id, { sub, inst, iat });
        if (!gate.run) {
          console.info(`${tag} ${op} user ${sub.slice(0, 8)} -> ${gate.code}`);
          return reply(op, requestId, { ok: false, code: gate.code, retryable: gate.code === 'UPSTREAM_UNAVAILABLE', data: gate.data });
        }
      }

      const result = await spec.run(ctx, cmd, prep.prep);
      console.info(`${tag} ${op} user ${sub.slice(0, 8)} -> ${result.ok ? 'ok' : result.code}`);
      return reply(op, requestId, result);
    } catch (e) {
      const name = (e as Error)?.name;
      console.error(`${tag} unexpected error:`, name, (e as Error)?.message);
      if (name === 'TimeoutError' || name === 'TypeError') return reply(null, requestId, { ok: false, code: 'TRANSPORT_ERROR', retryable: true });
      return reply(null, requestId, { ok: false, code: 'UPSTREAM_UNAVAILABLE', retryable: true }, 500);
    }
  });
}
