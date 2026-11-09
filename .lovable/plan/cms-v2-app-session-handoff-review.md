# CMS v2 contacts: app-side session/identity handoff (REVIEW ONLY)

Status: proposal. No proposed code below has been applied, deployed or run.

## 1. Baseline
- Current HEAD when reviewed: `20a9a0354d950253c5acfc6545dad83f2c156a9f`. Supplied baseline: `e2b619e5f33a107159de5d9b1a78dbfd675eae40`.
- Drift: only `public/site-config.json` and `public/version.json` changed (auto version metadata). No relevant drift.

## 2. Source findings (source only; deployed runtime not inspected)
| # | Finding | Reference |
|---|---|---|
| F1 | The browser POSTs directly to n8n. Headers are `Content-Type` plus a shared header only. No `Authorization`/Supabase session. | `src/services/webhook/webhook-service.ts` ~L291-298 |
| F2 | The shared header is either global `webhook_auth_header_name/value` from app_settings (readable in the browser) or the per-profile `custom_webhook_auth_header_*`. | `auth-header-builder.ts` L18-46; `user-webhook-resolver.ts` L21-56, L127-160 |
| F3 | The payload `user_id`, `isAuthenticated`, `sessionId`, `location`, `ghl` all come from the browser. | `webhook-service.ts` payload block; `ghl-installation-resolver.ts` (browser query on `ghl_installations`) |
| F4 | The custom webhook override is resolved in the browser (custom over global). The destination is profile-configured, so it is not a trusted JWT destination. | `user-webhook-resolver.ts` L65-120 |
| F5 | `ghl-api-proxy` has `verify_jwt=false`. It checks only `x-ixty-proxy-secret`, then trusts body `user_id` and `endpoint`. | `supabase/functions/ghl-api-proxy/index.ts` L303-358; `supabase/config.toml` L62-63 |
| F6 | A server-side session check pattern already exists (`auth.getUser()` with the caller's Bearer token). | `supabase/functions/hermes-chat/index.ts` L29-42 |

Confirmed: the IT Helper statement "no Authorization header carrying the Supabase session" matches the source (F1). Whether n8n validates anything cannot be seen from here.

## 3. HighLevel dependencies (source only)
- Scopes requested: `src/components/settings/integrations/HighLevelConnectionCard.tsx:24` = `locations.readonly contacts.readonly contacts.write opportunities.readonly opportunities.write users.readonly`. There is no `oauth.write`, so a Company→Location exchange is not requested.
- Company→Location exchange (`/oauth/locationToken`): absent in all functions.
- Credential writers: `ghl-oauth-callback` (authorization_code, L91-245); `ghl-api-proxy` lazy refresh (L199-247); `ghl-token-refresh` (L137); `ghl-token-refresh-cron` (L89). There is no coordination between them (unchanged from earlier review).
- Source cannot establish the live token class, the granted scopes, or whether contacts calls succeed. These are live gates (section 9).

## 4. Recommended design (one): authenticated relay + signed actor assertion
```text
browser ──Bearer <supabase session>──▶ chat-relay (edge)
   chat-relay: getUser(token) → resolve webhook server-side → allowlist → resolve installation
   chat-relay ──X-Ixty-Actor (HMAC, 5 min) + shared hdr──▶ n8n chat caller (vy6OYZc01sRHRpPP)
   n8n: actor header → execution context (NOT prompt, NOT tool args)
CMS v2 (WJwAJ0X5Qy64MJ1q) ──X-Ixty-Actor + X-Cms-Service-Secret + typed args──▶ ghl-contacts (edge)
   ghl-contacts: verify secret, HMAC, aud, exp → re-check installation owner → fixed GHL request
```
Why this design: it is the smallest change that does all of the following.
- Puts a real server-side session check in front of the model.
- Keeps the user's JWT inside Supabase. It never goes to n8n, the model, or logs.
- Lets the contacts boundary take identity from a cryptographically bound value, not from the model's arguments or the browser.

It reuses the hermes-chat auth pattern and needs no schema table.

| Requirement | Answer |
|---|---|
| Where the session comes from | `supabase.auth.getSession()` in the browser, sent as `Authorization: Bearer` to `chat-relay` only |
| Server check | `auth.getUser(token)` against this project (`SUPABASE_URL`). A token from another project, an expired token or a malformed token fails, and the function returns 401 before any n8n call |
| Identity propagation | `sub` from the verified user goes into an HMAC-signed assertion. Browser `user_id` is overwritten with the verified id |
| Installation/location | Looked up server-side with the service role by `user_id = sub AND connection_status='connected'`, then re-checked in `ghl-contacts` at call time |
| Internal handoff auth | HMAC-SHA256 (`CMS_ACTOR_SIGNING_KEY`), `aud=cms-v2`, `exp` ≤ 300s, plus a separate service secret `CMS_CONTACTS_SERVICE_SECRET` that n8n must present |
| Bypass prevention | `ghl-contacts` needs both secret and assertion. `ghl-api-proxy` `/contacts*` is fenced for pilot installations by flag |
| Fail closed | Every check returns 401/403 before any database read of credentials or any provider call |
| Destination leakage | Exact origin allowlist `https://n8n.ixty.ai`, path prefix `/webhook/`, `redirect:'manual'`, and 3xx treated as an error. The JWT is never forwarded |
| Preserved | Anonymous chat (unchanged direct path), Hermes, recall, attachments, feedback/signup webhooks, non-pilot users (flag-gated) |

## 5. Contracts
### 5.1 Browser → chat-relay
`POST /functions/v1/chat-relay`, `Authorization: Bearer <access_token>`. The body is the existing webhook payload unchanged. The server ignores `user_id`, `isAuthenticated` and `ghl`.

### 5.2 chat-relay → n8n
- Headers:
  - `Content-Type`;
  - existing shared/custom auth header (resolved server-side);
  - `X-Ixty-Actor: <b64url(payload)>.<b64url(hmac)>`.
- Body: the existing payload with the server-overwritten `user_id=sub`, `isAuthenticated=true`, `ghl` (server-resolved, non-secret), and `identity_verified: true` (informational only; never authorization).
- Response: the n8n response body is passed through unchanged with the same status, so `parseWebhookResponse` stays compatible.

Actor payload (trusted context):
```json
{"v":1,"sub":"<uuid>","iid":"<installation uuid>","loc":"<locationId>","aud":"cms-v2","iat":0,"exp":0,"jti":"<uuid>"}
```

### 5.3 CMS v2 → ghl-contacts
Headers: `X-Cms-Service-Secret`, `X-Ixty-Actor`. The body holds typed business args only:
```json
{"op":"contacts.search","args":{"query":"string(1..200)","limit":"int 1..50"}}
{"op":"contacts.get","args":{"contactId":"^[A-Za-z0-9]{1,64}$"}}
```
The schema is strict, so unknown keys such as `user_id`, `locationId` or `endpoint` cause a 400.

Response: `{ok:true, data}` or `{ok:false, error:"<code>"}`. Error codes: `unauthorized`, `forbidden`, `installation_unavailable`, `provider_error`.

## 6. Proposed patch (NOT APPLIED)

### 6.1 `supabase/functions/_shared/actor-assertion.ts` (new)
```ts
const enc = new TextEncoder();
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));

export interface Actor { v: 1; sub: string; iid: string; loc: string; aud: 'cms-v2'; iat: number; exp: number; jti: string; }

async function key(secret: string) {
  if (!secret || secret.length < 32) throw new Error('signing_key_missing');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signActor(a: Omit<Actor,'v'|'aud'|'iat'|'exp'|'jti'>, secret: string, ttl = 300): Promise<string> {
  const now = Math.floor(Date.now()/1000);
  const body: Actor = { v: 1, aud: 'cms-v2', iat: now, exp: now + Math.min(ttl, 300), jti: crypto.randomUUID(), ...a };
  const p = b64u(enc.encode(JSON.stringify(body)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(p)));
  return `${p}.${b64u(sig)}`;
}

export async function verifyActor(token: string | null, secret: string): Promise<Actor | null> {
  if (!token || token.length > 2048) return null;
  const [p, s, extra] = token.split('.');
  if (!p || !s || extra !== undefined) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(secret), unb64u(s), enc.encode(p));
    if (!ok) return null;
    const a = JSON.parse(new TextDecoder().decode(unb64u(p))) as Actor;
    const now = Math.floor(Date.now()/1000);
    const uuid = /^[0-9a-f-]{36}$/i;
    if (a.v !== 1 || a.aud !== 'cms-v2' || !uuid.test(a.sub) || !uuid.test(a.iid)
        || typeof a.loc !== 'string' || !/^[A-Za-z0-9]{1,64}$/.test(a.loc)
        || !(a.exp > now) || a.exp - a.iat > 300 || a.iat > now + 30) return null;
    return a;
  } catch { return null; }
}
```

### 6.2 `supabase/functions/chat-relay/index.ts` (new; outline with the security-critical parts complete)
```ts
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { signActor } from '../_shared/actor-assertion.ts';

const ALLOWED_ORIGIN = 'https://n8n.ixty.ai';
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function allowed(u: string) {
  try { const x = new URL(u); return x.origin === ALLOWED_ORIGIN && x.pathname.startsWith('/webhook/') && !x.username && !x.password; }
  catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'unauthorized' });
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: { user }, error } = await anon.auth.getUser(auth.slice(7));
  if (error || !user) return json(401, { error: 'unauthorized' });         // expired / invalid / wrong project

  const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: prof } = await svc.from('profiles')
    .select('webhook_url, custom_webhook_enabled, custom_webhook_use_auth, custom_webhook_auth_header_name, custom_webhook_auth_header_value, cms_relay_enabled')
    .eq('id', user.id).maybeSingle();
  if (!prof?.cms_relay_enabled) return json(403, { error: 'relay_not_enabled' });

  // destination: custom over global, mirroring user-webhook-resolver.ts
  const { data: s } = await svc.from('app_settings').select('key, value')
    .in('key', ['authenticated_webhook_url','authenticated_webhook_url_use_auth','webhook_auth_header_name','webhook_auth_header_value']);
  const st = Object.fromEntries((s ?? []).map(r => [r.key, r.value]));
  const isCustom = !!(prof.custom_webhook_enabled && prof.webhook_url);
  const dest = isCustom ? prof.webhook_url : st.authenticated_webhook_url;
  if (!dest || !allowed(dest)) return json(502, { error: 'destination_not_allowed' });
  const hdrs: Record<string,string> = { 'Content-Type': 'application/json' };
  if (isCustom && prof.custom_webhook_use_auth && prof.custom_webhook_auth_header_name && prof.custom_webhook_auth_header_value)
    hdrs[prof.custom_webhook_auth_header_name] = prof.custom_webhook_auth_header_value;
  else if (!isCustom && st.authenticated_webhook_url_use_auth === 'true' && st.webhook_auth_header_value)
    hdrs[st.webhook_auth_header_name || 'X-Webhook-Token'] = st.webhook_auth_header_value;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: 'bad_json' }); }
  if (typeof body?.message !== 'string') return json(400, { error: 'bad_payload' });

  const { data: inst } = await svc.from('ghl_installations')
    .select('id, location_id, location_name, company_id, company_name, connection_status')
    .eq('user_id', user.id).eq('connection_status', 'connected').maybeSingle();
  if (inst?.location_id) hdrs['X-Ixty-Actor'] = await signActor({ sub: user.id, iid: inst.id, loc: inst.location_id }, Deno.env.get('CMS_ACTOR_SIGNING_KEY')!);

  const out = { ...body, user_id: user.id, isAuthenticated: true, identity_verified: true,
    ghl: inst ? { location_id: inst.location_id, location_name: inst.location_name, company_id: inst.company_id, company_name: inst.company_name, connection_status: inst.connection_status } : undefined };
  const ctl = AbortSignal.timeout(115_000);
  const r = await fetch(dest, { method: 'POST', headers: hdrs, body: JSON.stringify(out), redirect: 'manual', signal: ctl });
  if (r.status >= 300 && r.status < 400) return json(502, { error: 'redirect_refused' });
  return new Response(await r.text(), { status: r.status, headers: { ...corsHeaders, 'Content-Type': r.headers.get('Content-Type') ?? 'application/json' } });
});
```
Notes:
- Never log `auth`, `hdrs` or the actor.
- `webhook_auth_header_*` key names must be confirmed against app_settings at implementation time.
- Time limit: edge functions cap at about 150s, and the current client timeout setting must be ≤ 115s for the relay path. Flag this to IT Helper if the AI turns run longer.

### 6.3 `supabase/functions/ghl-contacts/index.ts` (new; outline)
```ts
import { z } from 'npm:zod@3';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyActor } from '../_shared/actor-assertion.ts';
// timing-safe compare
const eq = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i=0;i<a.length;i++) d |= a.charCodeAt(i)^b.charCodeAt(i); return d === 0; };
const Req = z.discriminatedUnion('op', [
  z.object({ op: z.literal('contacts.search'), args: z.object({ query: z.string().min(1).max(200), limit: z.number().int().min(1).max(50).default(20) }).strict() }).strict(),
  z.object({ op: z.literal('contacts.get'),    args: z.object({ contactId: z.string().regex(/^[A-Za-z0-9]{1,64}$/) }).strict() }).strict(),
]);
Deno.serve(async (req) => {
  if (req.method !== 'POST') return j(405,'method_not_allowed');
  const sec = Deno.env.get('CMS_CONTACTS_SERVICE_SECRET') ?? '';
  if (!sec || !eq(req.headers.get('X-Cms-Service-Secret') ?? '', sec)) return j(401,'unauthorized');
  const actor = await verifyActor(req.headers.get('X-Ixty-Actor'), Deno.env.get('CMS_ACTOR_SIGNING_KEY')!);
  if (!actor) return j(401,'unauthorized');
  const parsed = Req.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return j(400,'bad_request');
  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: inst } = await svc.from('ghl_installations').select('id, user_id, location_id, connection_status')
    .eq('id', actor.iid).maybeSingle();
  if (!inst || inst.user_id !== actor.sub || inst.location_id !== actor.loc || inst.connection_status !== 'connected') return j(403,'forbidden');
  const token = await getLocationAccessToken(svc, inst.id);   // existing decrypt path; NO refresh here in pilot
  if (!token) return j(409,'installation_unavailable');
  const base = 'https://services.leadconnectorhq.com';
  const r = parsed.data.op === 'contacts.search'
    ? await fetch(`${base}/contacts/search`, { method:'POST', redirect:'manual', headers: gh(token), body: JSON.stringify({ locationId: actor.loc, query: parsed.data.args.query, pageLimit: parsed.data.args.limit }) })
    : await fetch(`${base}/contacts/${encodeURIComponent(parsed.data.args.contactId)}`, { method:'GET', redirect:'manual', headers: gh(token) });
  if (!r.ok) return j(502,'provider_error', { status: r.status });       // no provider body echoed
  const data = await r.json();
  if (parsed.data.op === 'contacts.get' && data?.contact?.locationId !== actor.loc) return j(403,'forbidden'); // cross-location guard
  return new Response(JSON.stringify({ ok: true, data }), { headers: { 'Content-Type': 'application/json' } });
});
// gh(token) = { Authorization:`Bearer ${token}`, Version:'2021-07-28', Accept:'application/json', 'Content-Type':'application/json' }
```
- No CORS headers: this function is server-to-server only.
- `getLocationAccessToken` reuses the existing decrypt logic. It is deliberately read-only (no refresh), because refresh stays with the existing writers until the reviewed lifecycle manager lands.
- The API version is pinned to the existing `2021-07-28`.

### 6.4 `ghl-api-proxy` fence (diff)
```diff
     const { user_id, endpoint, method = 'GET', body, query } = await req.json();
+    // CMS v2 cutover fence: contacts must go through ghl-contacts
+    if (typeof endpoint === 'string' && /^\/?contacts(\/|$|\?)/i.test(endpoint.trim())) {
+      const { data: f } = await supabase.from('app_settings').select('value').eq('key','ghl_proxy_contacts_fenced').maybeSingle();
+      if (f?.value === 'true') return new Response(JSON.stringify({ error: 'route_moved' }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
+    }
```
The pilot is a single installation, so a global flag is acceptable. Widening to all users requires the legacy workflow `luqGQ154hrSvAf4n` contacts nodes to be migrated first.

### 6.5 Frontend: `src/services/webhook/webhook-service.ts` (diff, gated)
```diff
-    const response = await fetch(webhookUrl, {
+    const useRelay = isAuthenticated && userInfo?.cms_relay_enabled === true;
+    let response: Response;
+    if (useRelay) {
+      const { data: { session } } = await supabase.auth.getSession();
+      if (!session?.access_token) throw new Error('Session expired. Please sign in again.');
+      response = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/chat-relay`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
+        body: JSON.stringify(payload), signal: controller.signal });
+    } else response = await fetch(webhookUrl, {
```
The `userInfo` type gains `cms_relay_enabled?: boolean`, read from the existing profile load. This is a UI hint only: the server re-checks it, so a forged `true` just yields 403. All response handling below this point is unchanged.

### 6.6 Schema (migration, proposed)
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cms_relay_enabled boolean NOT NULL DEFAULT false;
-- prevent self-enable: extend existing profiles UPDATE protection (trigger) so only admins can change it
INSERT INTO public.app_settings(key, value) VALUES ('ghl_proxy_contacts_fenced','false') ON CONFLICT (key) DO NOTHING;
```
The new `ghl_proxy_contacts_fenced` key must not be added to the anon/authenticated SELECT allowlists (admin + service only).

### 6.7 config.toml
```toml
[functions.chat-relay]
verify_jwt = false   # validated in code via getUser
[functions.ghl-contacts]
verify_jwt = false   # service secret + HMAC actor
```

## 7. n8n specification (IT Helper performs)
1. Chat caller `vy6OYZc01sRHRpPP`: read `{{$json.headers['x-ixty-actor']}}`. Pass it to the MCP client as a fixed (non-model) header or a hidden trusted parameter. Never add it to the system prompt, memory, or tool schema.
2. CMS v2 `WJwAJ0X5Qy64MJ1q` app-facing MCP entrypoint:
   - Accepts typed `contacts.search`/`contacts.get` args only.
   - Forwards `X-Ixty-Actor` (trusted context) and `X-Cms-Service-Secret` (n8n credential) to `https://ymtdtzkskjdqlzhjuesk.supabase.co/functions/v1/ghl-contacts`.
   - Disables "follow redirects".
3. Ignore `user_id`/`ghl.location_id` in the body for authorization. They are informational.
4. Execution data: redact the actor and secret headers, or disable saving successful execution data for these nodes.
5. Do not wire any CMS v2 contacts path to `ghl-api-proxy`.

## 8. Deployment order / rollback
1. Generate secrets `CMS_ACTOR_SIGNING_KEY` (≥64 chars) and `CMS_CONTACTS_SERVICE_SECRET` (shared with n8n, so the user must paste it into n8n). Store them by name only.
2. Migration (6.6). Every user stays at `cms_relay_enabled=false`, so there is no behavior change.
3. Deploy `ghl-contacts` and `chat-relay`. Edge functions auto-deploy on save, but both are inert without callers and the flag.
4. Frontend change (6.5). It is inert until the flag is on. It reaches ixty.ai only on publish, which requires an active paid plan for the custom domain. Until then it is testable on `iai-spark.lovable.app` and the preview.
5. IT Helper: n8n wiring (section 7).
6. Set `cms_relay_enabled=true` for the pilot UID only.
7. After acceptance, set `ghl_proxy_contacts_fenced=true` (6.4).

Rollback:
- Set the flag false. The browser returns to the direct path immediately.
- Set the fence false.
- The functions can remain deployed (they reject without both secrets).

Fence the old route: until step 7, `ghl-api-proxy` remains a bypass for any `x-ixty-proxy-secret` holder (F5).

## 9. Live-evidence gates (separately authorized)
- G1: the token class and contacts authorization for installation `7a1087ef-bcae-4331-85dd-372197f1fd05`. Use one approved `ghl-token-inspect` run plus one supervised `contacts.search`. If it is Company-class, contacts will 401 (historical `authClass` error). The reviewed token-lifecycle Location exchange (which needs `oauth.write`, currently not requested) must land first. **This is the main blocker for the milestone.**
- G2: n8n header passthrough and redaction behave as specified.
- G3: the end-to-end turn completes within the edge timeout.

## 10. Proposed tests (NOT RUN)
chat-relay:
1. A valid session reaches the mock n8n with the overwritten `user_id=sub` and a valid actor. The response is passed through byte-identical.
2. Missing, malformed, expired, other-project or anon-key bearer tokens → 401, with zero outbound fetches.
3. A body with `user_id`/`ghl.location_id` of another user → the forwarded values are the verified ones.
4. `cms_relay_enabled=false` → 403, no fetch.
5. Destinations `http://n8n.ixty.ai`, `https://n8n.ixty.ai.evil.com`, `https://u:p@n8n.ixty.ai/webhook/x`, `https://n8n.ixty.ai/rest/x` → 502, no fetch.
6. Mock 302 → 502 `redirect_refused`. The redirect target receives nothing.
7. The outgoing request never contains the `Authorization` header or the JWT substring.
8. No installation → forwarded without `X-Ixty-Actor`.

actor-assertion:
9. Round-trip succeeds.
10. Any of these is rejected:
   - a flipped bit in the payload or signature;
   - the wrong key;
   - `aud` ≠ cms-v2;
   - an expired assertion;
   - `exp-iat>300`;
   - extra segments;
   - an over-long token.

ghl-contacts:
11. Missing or wrong service secret → 401 before the DB read.
12. Missing or invalid actor → 401.
13. Args containing `locationId`, `user_id`, `endpoint` or an unknown `op` → 400.
14. The actor's `iid` belongs to another user, or `loc` mismatches the row, or the installation is not connected → 403, no provider call.
15. `contacts.get` returning another `locationId` → 403.
16. A provider 401 → 502 `provider_error`, with no provider body or token echoed.
17. Outbound URLs are exactly the two allowed paths on `services.leadconnectorhq.com`, with `redirect:'manual'`.

Fence and frontend:
18. Flag on: `/contacts/search` via `ghl-api-proxy` → 410. Other endpoints are unaffected.
19. Flag off: unchanged.
20. Anonymous chat uses the direct path, unchanged.
21. Relay off: authenticated chat is unchanged.
22. Relay on: `parseWebhookResponse` handles the relayed response.
23. Hermes path is unaffected.

## 11. Explicitly NOT performed
- No executable frontend/backend edits, deployments, migrations, RLS or settings changes, secret changes, or n8n changes.
- No token decrypt, inspection, refresh, exchange or reconnect.
- No CRM or HighLevel calls, authenticated requests, or test runs.
- The only file written is this document.
