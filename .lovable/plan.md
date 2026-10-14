# ghl-token-inspect: code-only review artifact (not deployed, not executed)

## Status and limits
- Planning mode blocks every file write except this plan, including scratch files in `/tmp`. So the tests below are **written but not run**. No test output exists yet, and I am not claiming any.
- If you approve this plan, the only next step is: write these files to a scratch folder **outside the project** (`/tmp/gti/`), run `deno test` offline, and return the real output. No project files, no `config.toml` change, no deploy, no real token read, no HighLevel call.
- Accepted from your notes: the original inactive-location claim is reported but cannot be verified. A `connected` status does not prove the CRM is reachable. The live authClass 401 is still the open question. The n8n inventory is final (59 definitions at 2026-10-14T14:07:58Z, 46 nodes in `luqGQ154hrSvAf4n`, 1 in `WJwAJ0X5Qy64MJ1q`, shared header credential also in `vy6OYZc01sRHRpPP`). No credential rotation.
- Later live run (needs its own approval): exactly one admin call with `installation_id = 7a1087ef-bcae-4331-85dd-372197f1fd05`.

## Design decisions (refinements 1–8)
- Split into `handler.ts` (pure, takes injected dependencies, so it can be tested offline) and `index.ts` (connects the real Supabase client), plus `crypto.ts` (same AES-GCM scheme as `ghl-token-refresh`).
- Sign-in is checked with `auth.getUser()`. If that fails, the request gets 401, or 503 if the lookup itself errors. The role check requires `error` to be empty **and** `data === true`. Any RPC or database error returns `503 service_unavailable` and is never reported as "not found."
- Order of checks: method, Authorization format, user, role, body, database read, decryption. Non-admin requests never touch encrypted columns or call `decrypt`.
- Only POST is accepted (OPTIONS gets a 204 preflight for one allowed origin). Body is limited to 1 KB and must be exactly `{installation_id: uuid}`. Every response has `Cache-Control: no-store`. Logs are fixed event names plus the installation ID and a reason code. They never include raw errors, claim text, ciphertext or keys.
- Decoding fails safely for: opaque or non-JWT tokens, bad base64url, invalid UTF-8, invalid JSON, claims that are null, an array or not an object, and an `exp` that is missing, not a number or out of range. Each failure returns `decode_status` with a reason code. Every output value is checked and limited. Missing information stays `null`.
- Comparisons take the token class into account and use three states (true, false, or null for unknown). The token's location is `authClassId` **only** when the class is Location. The token's company is an explicit valid `companyId` claim, or else `authClassId` only when the class is Company. If either side is unknown, the result is `null`, not a mismatch.
- Every response carries `note`: the claims are unverified diagnostic metadata. Nothing uses this output to make an auth decision or change a token.

## Diff (all new files; `config.toml` diff below)

### `supabase/functions/ghl-token-inspect/handler.ts`
```ts
// Diagnostic only. Decoded HighLevel claims are UNVERIFIED metadata.
export interface InstallationRow { id: string; location_id: string | null; company_id: string | null; access_token_encrypted: string | null; }
export interface Deps {
  getUser: (authHeader: string) => Promise<{ userId: string | null; error: unknown }>;
  isAdmin: (userId: string) => Promise<{ data: unknown; error: unknown }>;
  fetchRow: (id: string) => Promise<{ data: InstallationRow | null; error: unknown }>;
  decrypt: (ciphertext: string) => Promise<string>;
  log: (event: string, fields?: Record<string, string | number | boolean | null>) => void;
  allowedOrigin: string;
}
const MAX_BODY_BYTES = 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GHL_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const CLASSES = new Set(['Location', 'Company', 'Agency', 'User']);
const MIN_EXP = 946684800, MAX_EXP = 4102444800;
const NOTE = 'Unverified decoded claims; not proof of validity, ownership, scope authorization or location activation.';

export function corsFor(origin: string) {
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Vary': 'Origin' };
}
export function j(status: number, body: unknown, origin: string): Response {
  return new Response(JSON.stringify(body), { status,
    headers: { ...corsFor(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

type Claims = Record<string, unknown>;
export function decodeClaims(token: string): { ok: true; claims: Claims } | { ok: false; reason: string } {
  if (typeof token !== 'string' || !token || token.length > 16384) return { ok: false, reason: 'token_unreadable' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'opaque_or_non_jwt' };
  const seg = parts[1];
  if (!/^[A-Za-z0-9_-]+$/.test(seg)) return { ok: false, reason: 'malformed_base64url' };
  let bytes: Uint8Array;
  try { const b64 = seg.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((seg.length + 3) % 4);
        bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); }
  catch { return { ok: false, reason: 'malformed_base64url' }; }
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return { ok: false, reason: 'invalid_utf8' }; }
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, reason: 'invalid_json' }; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, reason: 'claims_not_object' };
  return { ok: true, claims: parsed as Claims };
}
const idOrNull = (v: unknown) => (typeof v === 'string' && GHL_ID_RE.test(v) ? v : null);
const cmp = (a: string | null, b: string | null) => (a === null || b === null ? null : a === b);

export function summarize(c: Claims, row: InstallationRow) {
  const authClass = typeof c.authClass === 'string' && CLASSES.has(c.authClass) ? c.authClass : null;
  const classId = idOrNull(c.authClassId);
  const coClaim = idOrNull(c.companyId);
  const tokenLoc = authClass === 'Location' ? classId : null;
  const tokenCo = coClaim ?? (authClass === 'Company' ? classId : null);
  const exp = typeof c.exp === 'number' && Number.isFinite(c.exp) && c.exp >= MIN_EXP && c.exp <= MAX_EXP
    ? new Date(c.exp * 1000).toISOString() : null;
  let scopeCount: number | null = null;
  const m = c.oauthMeta;
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    const s = (m as Claims).scopes; if (Array.isArray(s) && s.length <= 1000) scopeCount = s.length;
  }
  return {
    auth_class: authClass,
    matches_location: authClass === null ? null : authClass === 'Location' ? cmp(tokenLoc, idOrNull(row.location_id)) : false,
    matches_company: cmp(tokenCo, idOrNull(row.company_id)),
    company_claim_present: coClaim !== null,
    scope_count: scopeCount,
    exp_utc: exp,
  };
}

export function createHandler(d: Deps) {
  const o = d.allowedOrigin;
  const unavailable = (ev: string) => { d.log(ev); return j(503, { error: 'service_unavailable' }, o); };
  return async (req: Request): Promise<Response> => {
    try {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...corsFor(o), 'Cache-Control': 'no-store' } });
      if (req.method !== 'POST') return j(405, { error: 'method_not_allowed' }, o);
      const auth = req.headers.get('Authorization') ?? '';
      if (!/^Bearer [A-Za-z0-9._-]+$/.test(auth)) return j(401, { error: 'unauthorized' }, o);

      let u; try { u = await d.getUser(auth); } catch { return unavailable('auth_lookup_failed'); }
      if (u.error || !u.userId) return j(401, { error: 'unauthorized' }, o);
      let r; try { r = await d.isAdmin(u.userId); } catch { return unavailable('role_lookup_failed'); }
      if (r.error) return unavailable('role_lookup_failed');
      if (r.data !== true) return j(403, { error: 'forbidden' }, o);

      if (Number(req.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) return j(413, { error: 'payload_too_large' }, o);
      const raw = await req.text();
      if (raw.length > MAX_BODY_BYTES) return j(413, { error: 'payload_too_large' }, o);
      let body: unknown; try { body = JSON.parse(raw); } catch { return j(400, { error: 'invalid_input' }, o); }
      const ok = body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 1;
      const id = ok ? (body as Claims).installation_id : undefined;
      if (typeof id !== 'string' || !UUID_RE.test(id)) return j(400, { error: 'invalid_input' }, o);

      let row; try { row = await d.fetchRow(id); } catch { return unavailable('db_read_failed'); }
      if (row.error) return unavailable('db_read_failed');
      if (!row.data) return j(404, { error: 'not_found' }, o);
      const rec = row.data;
      if (!rec.access_token_encrypted) return j(200, { installation_id: rec.id, token_present: false, note: NOTE }, o);

      let token: string;
      try { token = await d.decrypt(rec.access_token_encrypted); }
      catch { d.log('decrypt_failed', { installation_id: rec.id });
              return j(200, { installation_id: rec.id, token_present: true, decode_status: 'decrypt_failed', note: NOTE }, o); }
      const dec = decodeClaims(token);
      if (!dec.ok) { d.log('decode_failed', { installation_id: rec.id, reason: dec.reason });
                     return j(200, { installation_id: rec.id, token_present: true, decode_status: dec.reason, note: NOTE }, o); }
      d.log('inspected', { installation_id: rec.id });
      return j(200, { installation_id: rec.id, token_present: true, decode_status: 'ok', ...summarize(dec.claims, rec), note: NOTE }, o);
    } catch { d.log('unhandled'); return j(500, { error: 'internal_error' }, o); }
  };
}
```

### `supabase/functions/ghl-token-inspect/crypto.ts`
```ts
// Same AES-GCM scheme as ghl-token-refresh decryptToken (IV = first 12 bytes).
export async function decryptToken(encryptedData: string, key: string): Promise<string> {
  const keyData = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
  const k = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
  const all = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  if (all.length < 13) throw new Error('ciphertext_too_short');
  const out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, k, all.slice(12));
  return new TextDecoder('utf-8', { fatal: true }).decode(out);
}
```

### `supabase/functions/ghl-token-inspect/index.ts`
```ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHandler, j } from './handler.ts';
import { decryptToken } from './crypto.ts';
const URL_ = Deno.env.get('SUPABASE_URL'), ANON = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), KEY = Deno.env.get('GHL_TOKEN_ENCRYPTION_KEY');
const ORIGIN = 'https://ixty.ai';
const log = (event: string, f: Record<string, string | number | boolean | null> = {}) =>
  console.log(JSON.stringify({ fn: 'ghl-token-inspect', event, ...f }));
if (!URL_ || !ANON || !SERVICE || !KEY) {
  log('config_missing');
  Deno.serve(() => j(503, { error: 'service_unavailable' }, ORIGIN));
} else {
  const svc = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  Deno.serve(createHandler({
    allowedOrigin: ORIGIN, log,
    getUser: async (h) => {
      const c = createClient(URL_, ANON, { global: { headers: { Authorization: h } }, auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await c.auth.getUser();
      return { userId: data?.user?.id ?? null, error };
    },
    isAdmin: async (id) => { const { data, error } = await svc.rpc('has_role', { _user_id: id, _role: 'admin' }); return { data, error }; },
    fetchRow: async (id) => { const { data, error } = await svc.from('ghl_installations')
      .select('id, location_id, company_id, access_token_encrypted').eq('id', id).maybeSingle(); return { data, error }; },
    decrypt: (ct) => decryptToken(ct, KEY),
  }));
}
```

### `supabase/config.toml`
```diff
 [functions.hermes-chat]
 verify_jwt = false
+
+[functions.ghl-token-inspect]
+verify_jwt = false   # JWT validated in code via auth.getUser(); admin role required
```

### `supabase/functions/ghl-token-inspect/handler.test.ts` (offline, synthetic data only)
```ts
import { assertEquals, assert } from 'jsr:@std/assert@1';
import { createHandler, decodeClaims, summarize, Deps } from './handler.ts';
import { decryptToken } from './crypto.ts';

const ID = '7a1087ef-bcae-4331-85dd-372197f1fd05', LOC = 'LOCsynthetic000001', CO = 'COsynthetic0000001';
const SENTINEL = 'SENTINELSECRETxyz';
const b64u = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (c: unknown) => `${b64u('{"alg":"none"}')}.${b64u(JSON.stringify(c))}.${SENTINEL}`;
const exp = 1893456000;

function mk(over: Partial<Deps> = {}, token = jwt({ authClass: 'Location', authClassId: LOC, companyId: CO, exp })) {
  const logs: string[] = []; const calls = { fetch: 0, decrypt: 0 };
  const d: Deps = {
    allowedOrigin: 'https://ixty.ai', log: (e, f) => logs.push(JSON.stringify({ e, ...f })),
    getUser: async () => ({ userId: 'u1', error: null }),
    isAdmin: async () => ({ data: true, error: null }),
    fetchRow: async (id) => { calls.fetch++; return { data: { id, location_id: LOC, company_id: CO, access_token_encrypted: 'CIPHER' + SENTINEL }, error: null }; },
    decrypt: async () => { calls.decrypt++; return token; }, ...over,
  };
  return { h: createHandler(d), logs, calls };
}
const post = (body: unknown = { installation_id: ID }, auth = 'Bearer abc.def.ghi') =>
  new Request('http://x', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
async function run(m: ReturnType<typeof mk>, req = post()) {
  const res = await m.h(req); const text = await res.text();
  assertEquals(res.headers.get('Cache-Control'), 'no-store');
  assert(!text.includes(SENTINEL) && !m.logs.join().includes(SENTINEL), 'secret leaked');
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

// Auth / role / method
Deno.test('1 no auth header -> 401, no DB read', async () => { const m = mk(); const r = await run(m, post(undefined, '')); assertEquals(r.status, 401); assertEquals(m.calls.fetch, 0); });
Deno.test('2 non-admin -> 403, no DB read/decrypt', async () => { const m = mk({ isAdmin: async () => ({ data: false, error: null }) }); assertEquals((await run(m)).status, 403); assertEquals(m.calls, { fetch: 0, decrypt: 0 }); });
Deno.test('2b role data "true" string is not admin', async () => { const m = mk({ isAdmin: async () => ({ data: 'true', error: null }) }); assertEquals((await run(m)).status, 403); });
Deno.test('2c role data null is not admin', async () => { const m = mk({ isAdmin: async () => ({ data: null, error: null }) }); assertEquals((await run(m)).status, 403); });
Deno.test('2d role RPC error -> 503, no read', async () => { const m = mk({ isAdmin: async () => ({ data: true, error: { message: SENTINEL } }) }); assertEquals((await run(m)).status, 503); assertEquals(m.calls.fetch, 0); });
Deno.test('2e role RPC throws -> 503', async () => { const m = mk({ isAdmin: async () => { throw new Error(SENTINEL); } }); assertEquals((await run(m)).status, 503); });
Deno.test('2f getUser error -> 401', async () => { const m = mk({ getUser: async () => ({ userId: 'u1', error: { message: 'bad' } }) }); assertEquals((await run(m)).status, 401); });
Deno.test('2g getUser throws -> 503', async () => { const m = mk({ getUser: async () => { throw new Error(SENTINEL); } }); assertEquals((await run(m)).status, 503); });
Deno.test('8 anon/no user -> 401', async () => { const m = mk({ getUser: async () => ({ userId: null, error: null }) }); assertEquals((await run(m)).status, 401); });
Deno.test('GET -> 405', async () => { const m = mk(); assertEquals((await run(m, new Request('http://x', { method: 'GET' }))).status, 405); });
Deno.test('OPTIONS -> 204 with POST-only CORS', async () => { const res = await mk().h(new Request('http://x', { method: 'OPTIONS' })); await res.body?.cancel(); assertEquals(res.status, 204); assertEquals(res.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS'); });

// Input
Deno.test('3 non-UUID -> 400', async () => assertEquals((await run(mk(), post({ installation_id: 'abc' }))).status, 400));
Deno.test('3b extra keys -> 400', async () => assertEquals((await run(mk(), post({ installation_id: ID, x: 1 }))).status, 400));
Deno.test('3c invalid JSON -> 400', async () => assertEquals((await run(mk(), post('{bad'))).status, 400));
Deno.test('3d oversized body -> 413', async () => assertEquals((await run(mk(), post('x'.repeat(2000)))).status, 413));

// DB
Deno.test('4 unknown id -> 404', async () => assertEquals((await run(mk({ fetchRow: async () => ({ data: null, error: null }) }))).status, 404));
Deno.test('4b DB error -> 503 not 404', async () => assertEquals((await run(mk({ fetchRow: async () => ({ data: null, error: { message: SENTINEL } }) }))).status, 503));
Deno.test('4c DB throws -> 503', async () => assertEquals((await run(mk({ fetchRow: async () => { throw new Error(SENTINEL); } }))).status, 503));

// Classes and comparisons
Deno.test('5 Location token matches', async () => { const b = (await run(mk())).body; assertEquals([b.auth_class, b.matches_location, b.matches_company], ['Location', true, true]); });
Deno.test('6 Company token', async () => { const b = (await run(mk({}, jwt({ authClass: 'Company', authClassId: CO, exp })))).body; assertEquals([b.auth_class, b.matches_location, b.matches_company], ['Company', false, true]); });
Deno.test('Location token without companyId -> company null, not mismatch', async () => { const b = (await run(mk({}, jwt({ authClass: 'Location', authClassId: LOC, exp })))).body; assertEquals([b.matches_location, b.matches_company, b.company_claim_present], [true, null, false]); });
Deno.test('wrong location -> false', async () => assertEquals((await run(mk({}, jwt({ authClass: 'Location', authClassId: 'OTHERloc', companyId: CO, exp })))).body.matches_location, false));
Deno.test('wrong company -> false', async () => assertEquals((await run(mk({}, jwt({ authClass: 'Location', authClassId: LOC, companyId: 'OTHERco', exp })))).body.matches_company, false));
Deno.test('unknown class -> nulls', async () => { const b = (await run(mk({}, jwt({ authClass: 'Weird', authClassId: LOC, exp })))).body; assertEquals([b.auth_class, b.matches_location, b.matches_company], [null, null, null]); });
Deno.test('row company null -> null', () => assertEquals(summarize({ authClass: 'Company', authClassId: CO }, { id: ID, location_id: LOC, company_id: null, access_token_encrypted: 'x' }).matches_company, null));

// Malformed tokens / claims / expiry
for (const [name, tok, reason] of [
  ['opaque', 'opaqueTokenNoDots', 'opaque_or_non_jwt'],
  ['bad b64url', 'a.@@@.c', 'malformed_base64url'],
  ['invalid utf8', `a.${b64u('\xff\xfe')}.c`, 'invalid_utf8'],
  ['invalid json', `a.${b64u('{nope')}.c`, 'invalid_json'],
  ['null claims', `a.${b64u('null')}.c`, 'claims_not_object'],
  ['array claims', `a.${b64u('[1]')}.c`, 'claims_not_object'],
  ['empty', '', 'token_unreadable'],
] as const) Deno.test(`decode ${name}`, async () => { const r = await run(mk({}, tok)); assertEquals(r.status, 200); assertEquals(r.body.decode_status, reason); assertEquals(r.body.auth_class, undefined); });
Deno.test('exp missing/string/out of range -> null', () => { for (const e of [undefined, '123', 1, 9e12, NaN]) assertEquals(summarize({ authClass: 'Location', exp: e }, { id: ID, location_id: LOC, company_id: CO, access_token_encrypted: 'x' }).exp_utc, null); });
Deno.test('scopes non-array -> null', () => assertEquals(summarize({ oauthMeta: { scopes: 'a b' } }, { id: ID, location_id: null, company_id: null, access_token_encrypted: 'x' }).scope_count, null));
Deno.test('oversized id claim -> null', () => assertEquals(summarize({ authClass: 'Location', authClassId: 'x'.repeat(100) }, { id: ID, location_id: LOC, company_id: CO, access_token_encrypted: 'x' }).matches_location, null));
Deno.test('decodeClaims never throws on garbage', () => { for (const t of ['..', 'a.b', 'a.b.c.d', '.\u0000.']) decodeClaims(t); });

// Decryption
Deno.test('decrypt throws -> decrypt_failed, sanitized', async () => assertEquals((await run(mk({ decrypt: async () => { throw new Error(SENTINEL); } }))).body.decode_status, 'decrypt_failed'));
Deno.test('real decryptToken rejects short/garbage ciphertext', async () => { for (const c of ['', 'AAAA', 'not-base64!']) { let threw = false; try { await decryptToken(c, 'k'); } catch { threw = true; } assert(threw); } });
Deno.test('no token stored -> token_present false, no decrypt', async () => { const m = mk({ fetchRow: async (id) => ({ data: { id, location_id: LOC, company_id: CO, access_token_encrypted: null }, error: null }) }); assertEquals((await run(m)).body.token_present, false); assertEquals(m.calls.decrypt, 0); });

// 7 secrets: enforced in run() for every test (body + logs never contain SENTINEL)
Deno.test('7 note labels output as unverified', async () => assert((await run(mk())).body.note.startsWith('Unverified')));
```

## After approval (scratch-only, no side effects)
1. Write the four files to `/tmp/gti/supabase/functions/ghl-token-inspect/`. No project files are touched.
2. Run `deno test --no-remote=false` on `handler.test.ts` offline (only the `jsr:@std/assert` download).
3. Return the full test output, plus the final diff if a test forces a code fix.
4. Deployment, the `config.toml` change and the single live inspection of `7a1087ef-bcae-4331-85dd-372197f1fd05` each wait for separate approval.
