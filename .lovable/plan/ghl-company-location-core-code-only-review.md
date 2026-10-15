# GHL Company→Location core — code-only review artifact

Status: REVIEW ONLY. Nothing deployed, no Supabase/function/config/migration/frontend/n8n files touched, no provider calls, no real token read, diagnostic not rerun. Proposed source lives only in this document (and scratch `/tmp/ghlcore/`). Fake IDs/credentials only.

## 1. Contract evidence (official HighLevel docs, fetched 2026-10-15)

| Item | 2021-07-28 (chosen) | v3 (not used) |
|---|---|---|
| Source | https://marketplace.gohighlevel.com/docs/2021-07-28/ghl/oauth/get-location-access-token ("no longer actively maintained") | https://marketplace.gohighlevel.com/docs/ghl/oauth/get-location-access-token |
| URL / method | `POST https://services.leadconnectorhq.com/oauth/locationToken` | `POST https://services.leadconnectorhq.com/oauth/location-token` |
| Version header | `2021-07-28` (required) | `v3` (required) |
| Body | `application/x-www-form-urlencoded`: `companyId`, `locationId` (both required) | same |
| Auth | `Bearer` Agency (Company) token | same |
| Required grant | scope `oauth.write` on the Company token | same |
| Response | `access_token`, `token_type`, `expires_in`, `scope`, `locationId`, `userId`, `planId`, `appId`, `versionId`, `refresh_token` ("used to obtain a new access token for this specific location") | same fields |

Refresh: https://marketplace.gohighlevel.com/docs/2021-07-28/ghl/oauth/get-access-token — `POST /oauth/token`, `grant_type=refresh_token`, `user_type` ∈ {`Company`,`Location`}, response includes `userType`. OAuth guide (https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0 §6) — refresh tokens are single-use and every refresh returns a new refresh token.

**Discrepancy resolution.** Both routes are documented; they are paired per API version (camelCase+`2021-07-28` vs hyphenated+`v3`). The core pins the 2021-07-28 pair because every existing iai-spark GHL function uses `Version: 2021-07-28`; mixing would be unreviewed. Moving to v3 is a separate, whole-contract change. Note: the OAuth guide §8 sample sends a **JSON** body to `/oauth/locationToken`; the endpoint reference specifies form-urlencoded. The core follows the reference (form-urlencoded); the guide sample is treated as non-normative.

**Evidence gaps (not inferred):**
- Whether our Company token actually holds `oauth.write` — a scope *count* of 32 proves nothing. Must be confirmed from the Marketplace app's scope config (human check) before any live exchange.
- The location-token reference schema does not list `userType`/`companyId`; the core accepts their absence but fails closed if present and wrong. `locationId` is required and must equal the server-bound value.
- Refreshing a *derived* Location refresh token via `/oauth/token` with `user_type=Location` is documented by implication (field description + refresh endpoint), not by an explicit worked example. Unverified live.

## 2. Credential modes
- `native_location` — Location install; own refresh token.
- `company_parent` — Company token + its own refresh token; `locationId` must be null.
- `derived_location` — produced only by exchange. Has the Location refresh token the provider returned, or `refreshToken: null` (access-only) if none was returned. It is **never** paired with the parent's refresh token; access-only credentials cannot refresh and must be re-derived from the parent.

## 3. Integration boundaries (NOT implemented; for later approval)
Interfaces the future shared token manager must provide; the core never touches them:
- `CredentialStore` — read/write encrypted credentials per installation (existing AES-GCM helpers). Must persist `mode`, parent/derived linkage, and `token_user_type`.
- `RefreshLock` — single-writer coordination per installation (DB row lock / compare-and-swap on `last_refresh_at`). Core is stateless so it **cannot** become a fourth independent writer; callers must go through the manager.
- `CallerAuth` — replace `x-ixty-proxy-secret` + body `user_id` trust in `ghl-api-proxy` (prior hardening finding 1).
- Real `Transport` — `fetch(url, {redirect:'manual'})` mapped to `HttpResponse`.

Later integration points (each to call the manager, not the core directly):
1. `ghl-oauth-callback` — after code exchange: if `userType=Company`, store `company_parent`, then exchange for the server-bound `locationId` (from install webhook/pending row, never from the browser).
2. `ghl-api-proxy` lazy refresh — replace inline refresh with manager `getValidLocationCredential(installation)`; also endpoint/method allowlist (findings 2–3).
3. `ghl-token-refresh` (manual) — delegate to manager.
4. `ghl-token-refresh-cron` — delegate; map `invalid_grant` to `expired`.

## 4. Remaining approval gates
Schema migration (`token_user_type`, mode/linkage columns); manager + adapters implementation; redeploys of the four functions; confirmation of `oauth.write`; one supervised live exchange; reconnect of the inactive location; Phases 2–7. Diagnostic remains deployed and untouched.

## 5. Test sequence
Runtime: 
`deno 2.6.10 (stable, release, x86_64-unknown-linux-gnu) v8 14.5.201.2-rusty typescript 5.9.2 `

Commands (cwd `/tmp/ghlcore`): `deno test --no-check token-core.test.ts` (RED, against stub that throws), then `deno test token-core.test.ts` (GREEN, type-checked).

RED (stub) tail:
```text
FAILED | 0 passed | 42 failed (38ms)
```
GREEN output:
```text
Check token-core.test.ts
running 42 tests from ./token-core.test.ts
validate: native Location response ok ... ok (1ms)
validate: Company response ok ... ok (0ms)
validate rejects: unknown class ... ok (0ms)
validate rejects: wrong class (Company when Location expected) ... ok (0ms)
validate rejects: location mismatch ... ok (0ms)
validate rejects: location missing ... ok (0ms)
validate rejects: company mismatch ... ok (0ms)
validate rejects: company response carrying locationId ... ok (0ms)
validate rejects: missing access token ... ok (0ms)
validate rejects: non-string access token ... ok (0ms)
validate rejects: bad token_type ... ok (0ms)
validate rejects: missing expiry ... ok (0ms)
validate rejects: negative expiry ... ok (0ms)
validate rejects: absurd expiry ... ok (0ms)
validate rejects: missing scope ... ok (0ms)
validate rejects: empty scope ... ok (0ms)
validate rejects: non-string refresh token ... ok (0ms)
validate rejects: malformed id in response ... ok (0ms)
validate rejects: array body ... ok (0ms)
exchange: deterministic request to fixed origin, form body, Version header, manual redirect ... ok (2ms)
exchange: no refresh_token returned => access-only derived, never parent refresh token ... ok (0ms)
exchange: refresh_token identical to parent refresh token is rejected (pair integrity) ... ok (1ms)
exchange: requires company_parent mode ... ok (0ms)
exchange: binding company must equal parent company (no request sent) ... ok (0ms)
exchange: malformed binding ids rejected before request ... ok (0ms)
exchange: expired parent rejected before request ... ok (0ms)
exchange: response for a different location rejected ... ok (1ms)
exchange: 3xx redirect rejected ... ok (0ms)
exchange: transport that followed a redirect / changed origin is rejected ... ok (0ms)
exchange: provider error status => provider_error without echoing body secrets ... ok (0ms)
exchange: non-JSON body ... ok (0ms)
exchange: transport throw is wrapped and sanitized ... ok (0ms)
refresh: derived location uses its own refresh token, user_type=Location, fixed origin ... ok (0ms)
refresh: company parent uses user_type=Company and must stay Company ... ok (0ms)
refresh: access-only derived credential cannot refresh (must re-derive from parent) ... ok (0ms)
refresh: response missing new refresh token is rejected (rotation required) ... ok (0ms)
refresh: response that changes class is rejected ... ok (0ms)
refresh: response for another location rejected ... ok (0ms)
refresh: redirect blocked ... ok (0ms)
refresh: incoherent credential (derived without location) rejected ... ok (0ms)
API surface exposes no origin/url override ... ok (0ms)
constants pinned ... ok (0ms)
ok | 42 passed | 0 failed (23ms)
```

## 6. Full SHA-256 of tested bytes
```text
c25400c9e1a896656f1ac978afae17390f440fef9b789811b49ea0dd9949c069  token-core.ts
f334e243dfa4373b55becb383407e7b1f13fd6640076e034b8a46a7e30cbd928  token-core.test.ts
```

## 7. Proposed source — target path `supabase/functions/_shared/ghl-token-core.ts` (future)
```ts
// HighLevel token-mode / response-validation / Company->Location exchange core.
// Scratch review artifact. Pure + dependency-injected: no storage, no env, no global fetch.
// Contract: HighLevel API Version 2021-07-28 (the version every existing iai-spark GHL
// function already uses). The v3 hyphenated route (/oauth/location-token, Version: v3)
// is deliberately NOT mixed in here.

export const GHL_ORIGIN = 'https://services.leadconnectorhq.com';
export const LOCATION_TOKEN_PATH = '/oauth/locationToken';
export const OAUTH_TOKEN_PATH = '/oauth/token';
export const API_VERSION = '2021-07-28';

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_EXPIRES_IN = 400 * 86400; // > 24h access tokens, fail closed on absurd values
const MAX_BODY = 64 * 1024;

export type Mode = 'native_location' | 'company_parent' | 'derived_location';
export type UserType = 'Company' | 'Location';

export interface Credential {
  mode: Mode;
  accessToken: string;
  /** null only for access-only derived credentials. Never a parent's refresh token. */
  refreshToken: string | null;
  expiresAt: number; // epoch ms
  scopes: string[];
  companyId: string;
  locationId: string | null; // null iff company_parent
}
export interface HttpRequest {
  url: string; method: 'POST'; headers: Record<string, string>; body: string; redirect: 'manual';
}
export interface HttpResponse {
  status: number; url: string; redirected: boolean; headers: Record<string, string>; bodyText: string;
}
export type Transport = (req: HttpRequest) => Promise<HttpResponse>;
export interface CoreDeps { transport: Transport; now: () => number }
export interface ClientCreds { clientId: string; clientSecret: string }
export interface Binding { companyId: string; locationId: string }
export interface ValidateCtx { expect: UserType; companyId: string; locationId: string | null; requireUserType?: boolean }

/** Error carrying only a fixed code. Never includes tokens, bodies or provider messages. */
export class CoreError extends Error {
  constructor(public readonly code: string, public readonly status?: number) { super(code); this.name = 'CoreError'; }
  toJSON() { return { code: this.code, status: this.status ?? null }; }
}
const fail = (code: string, status?: number): never => { throw new CoreError(code, status); };
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 16384;

export function validateTokenResponse(raw: unknown, ctx: ValidateCtx, nowMs: number, mode: Mode): Credential {
  if (!isObj(raw)) fail('invalid_response');
  const b = raw as Record<string, unknown>;
  if (!nonEmpty(b.access_token)) fail('invalid_access_token');
  if (b.token_type !== undefined && (typeof b.token_type !== 'string' || b.token_type.toLowerCase() !== 'bearer')) fail('invalid_token_type');
  if (typeof b.expires_in !== 'number' || !Number.isFinite(b.expires_in) || b.expires_in <= 0 || b.expires_in > MAX_EXPIRES_IN) fail('invalid_expiry');
  if (!nonEmpty(b.scope)) fail('invalid_scope');
  if (b.refresh_token !== undefined && b.refresh_token !== null && !nonEmpty(b.refresh_token)) fail('invalid_refresh_token');

  if (b.userType !== undefined || ctx.requireUserType) {
    if (b.userType !== ctx.expect) fail('wrong_class');
  }
  if (b.companyId !== undefined && b.companyId !== ctx.companyId) fail('company_mismatch');
  if (ctx.expect === 'Location') {
    if (typeof b.locationId !== 'string' || !ID_RE.test(b.locationId) || b.locationId !== ctx.locationId) fail('location_mismatch');
  } else if (b.locationId !== undefined && b.locationId !== null) {
    fail('location_mismatch'); // Company credential must not silently carry a location binding
  }
  return {
    mode,
    accessToken: b.access_token as string,
    refreshToken: nonEmpty(b.refresh_token) ? b.refresh_token : null,
    expiresAt: nowMs + (b.expires_in as number) * 1000,
    scopes: (b.scope as string).trim().split(/\s+/),
    companyId: ctx.companyId,
    locationId: ctx.expect === 'Location' ? ctx.locationId : null,
  };
}

async function send(d: CoreDeps, path: string, headers: Record<string, string>, body: string): Promise<unknown> {
  const url = `${GHL_ORIGIN}${path}`; // fixed origin; path is a module constant
  let res: HttpResponse;
  try {
    res = await d.transport({ url, method: 'POST', redirect: 'manual', body,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'Version': API_VERSION, ...headers } });
  } catch { return fail('transport_failed'); }
  if (res.redirected || (res.status >= 300 && res.status < 400) || res.url !== url) fail('redirect_blocked', res.status);
  if (res.status < 200 || res.status >= 300) fail('provider_error', res.status);
  if (typeof res.bodyText !== 'string' || res.bodyText.length > MAX_BODY) fail('invalid_response');
  try { return JSON.parse(res.bodyText); } catch { return fail('invalid_response'); }
}

function assertCoherent(c: Credential) {
  if (!ID_RE.test(c.companyId)) fail('incoherent_credential');
  if (c.mode === 'company_parent' ? c.locationId !== null : (c.locationId === null || !ID_RE.test(c.locationId))) fail('incoherent_credential');
}

/** Company access token -> Location credential for one server-bound (companyId, locationId). */
export async function exchangeCompanyForLocation(d: CoreDeps, parent: Credential, binding: Binding): Promise<Credential> {
  if (parent.mode !== 'company_parent') fail('wrong_mode');
  assertCoherent(parent);
  if (!ID_RE.test(binding.companyId) || !ID_RE.test(binding.locationId)) fail('invalid_binding');
  if (binding.companyId !== parent.companyId) fail('company_mismatch');
  if (!(parent.expiresAt > d.now())) fail('parent_expired');
  const body = new URLSearchParams({ companyId: binding.companyId, locationId: binding.locationId }).toString();
  const json = await send(d, LOCATION_TOKEN_PATH, { Authorization: `Bearer ${parent.accessToken}` }, body);
  const c = validateTokenResponse(json, { expect: 'Location', companyId: binding.companyId, locationId: binding.locationId }, d.now(), 'derived_location');
  if (c.refreshToken !== null && (c.refreshToken === parent.refreshToken || c.refreshToken === parent.accessToken)) fail('refresh_pair_integrity');
  if (c.accessToken === parent.accessToken) fail('refresh_pair_integrity');
  return c;
}

/** Rotate a credential with its OWN refresh token. Class and binding must be preserved. */
export async function refreshCredential(d: CoreDeps, client: ClientCreds, cred: Credential): Promise<Credential> {
  assertCoherent(cred);
  if (cred.refreshToken === null) fail('not_refreshable'); // access-only derived: re-derive from parent instead
  const userType: UserType = cred.mode === 'company_parent' ? 'Company' : 'Location';
  const body = new URLSearchParams({ client_id: client.clientId, client_secret: client.clientSecret,
    grant_type: 'refresh_token', refresh_token: cred.refreshToken as string, user_type: userType }).toString();
  const json = await send(d, OAUTH_TOKEN_PATH, {}, body);
  const c = validateTokenResponse(json, { expect: userType, companyId: cred.companyId, locationId: cred.locationId, requireUserType: true }, d.now(), cred.mode);
  if (c.refreshToken === null) fail('refresh_pair_integrity'); // documented rotation: new refresh token always returned
  return c;
}
```

## 8. Tests — target path `supabase/functions/_shared/ghl-token-core.test.ts` (future; import path `./ghl-token-core.ts`)
```ts
// Synthetic offline tests. Fake credentials/IDs only; injected transport; no network.
import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  CoreError, GHL_ORIGIN, LOCATION_TOKEN_PATH, OAUTH_TOKEN_PATH, API_VERSION,
  validateTokenResponse, exchangeCompanyForLocation, refreshCredential,
  type Credential, type HttpRequest, type HttpResponse, type Transport,
} from './token-core.ts';

const SECRET = 'SENTINEL_SECRET_DO_NOT_LEAK';
const CO = 'FakeCompany0001';
const LOC = 'FakeLocation0001';
const NOW = Date.UTC(2030, 0, 1);
const CLIENT = { clientId: 'fake-client-id', clientSecret: `client-${SECRET}` };

function rec(status: number, body: unknown, extra: Partial<HttpResponse> = {}) {
  const calls: HttpRequest[] = [];
  const t: Transport = async (req) => {
    calls.push(req);
    return { status, url: req.url, redirected: false, headers: {}, bodyText: typeof body === 'string' ? body : JSON.stringify(body), ...extra };
  };
  return { t, calls };
}
const parent = (o: Partial<Credential> = {}): Credential => ({
  mode: 'company_parent', accessToken: `parent-at-${SECRET}`, refreshToken: `parent-rt-${SECRET}`,
  expiresAt: NOW + 3_600_000, scopes: ['oauth.write', 'contacts.readonly'], companyId: CO, locationId: null, ...o,
});
const locResp = (o: Record<string, unknown> = {}) => ({
  access_token: `loc-at-${SECRET}`, token_type: 'Bearer', expires_in: 86399,
  scope: 'contacts.readonly contacts.write', locationId: LOC, companyId: CO, userType: 'Location',
  userId: 'FakeUser0001', refresh_token: `loc-rt-${SECRET}`, ...o,
});
const deps = (t: Transport) => ({ transport: t, now: () => NOW });

async function code(p: Promise<unknown>): Promise<string> {
  try { await p; } catch (e) {
    assert(e instanceof CoreError, 'must throw CoreError');
    assert(!String(e.message).includes(SECRET) && !JSON.stringify(e).includes(SECRET), 'secret leaked in error');
    return e.code;
  }
  throw new Error('expected rejection');
}

// ---------- validateTokenResponse ----------
Deno.test('validate: native Location response ok', () => {
  const c = validateTokenResponse(locResp(), { expect: 'Location', companyId: CO, locationId: LOC }, NOW, 'native_location');
  assertEquals(c.mode, 'native_location'); assertEquals(c.locationId, LOC);
  assertEquals(c.expiresAt, NOW + 86399_000); assertEquals(c.scopes, ['contacts.readonly', 'contacts.write']);
});
Deno.test('validate: Company response ok', () => {
  const c = validateTokenResponse(locResp({ userType: 'Company', locationId: undefined }), { expect: 'Company', companyId: CO, locationId: null }, NOW, 'company_parent');
  assertEquals(c.mode, 'company_parent'); assertEquals(c.locationId, null);
});
for (const [name, body, ctx, want] of [
  ['unknown class', locResp({ userType: 'Agency' }), { expect: 'Location', companyId: CO, locationId: LOC }, 'wrong_class'],
  ['wrong class (Company when Location expected)', locResp({ userType: 'Company' }), { expect: 'Location', companyId: CO, locationId: LOC }, 'wrong_class'],
  ['location mismatch', locResp({ locationId: 'OtherLocation01' }), { expect: 'Location', companyId: CO, locationId: LOC }, 'location_mismatch'],
  ['location missing', locResp({ locationId: undefined }), { expect: 'Location', companyId: CO, locationId: LOC }, 'location_mismatch'],
  ['company mismatch', locResp({ companyId: 'OtherCompany01' }), { expect: 'Location', companyId: CO, locationId: LOC }, 'company_mismatch'],
  ['company response carrying locationId', locResp({ userType: 'Company' }), { expect: 'Company', companyId: CO, locationId: null }, 'location_mismatch'],
  ['missing access token', locResp({ access_token: undefined }), { expect: 'Location', companyId: CO, locationId: LOC }, 'invalid_access_token'],
  ['non-string access token', locResp({ access_token: 42 }), { expect: 'Location', companyId: CO, locationId: LOC }, 'invalid_access_token'],
  ['bad token_type', locResp({ token_type: 'MAC' }), { expect: 'Location', companyId: CO, locationId: LOC }, 'invalid_token_type'],
  ['missing expiry', locResp({ expires_in: undefined }), { expect: 'Location', companyId: CO, locationId: LOC }, 'invalid_expiry'],
  ['negative expiry', locResp({ expires_in: -5 }), { expect: 'Location', companyId: CO, locationId: LOC }, 'invalid_expiry'],
  ['absurd expiry', locResp({ expires_in: 10 * 365 * 86400 }), { expect: 'Location', companyId: CO, locationId: LOC }, 'invalid_expiry'],
  ['missing scope', locResp({ scope: undefined }), { expect: 'Location', companyId: CO, locationId: LOC }, 'invalid_scope'],
  ['empty scope', locResp({ scope: '   ' }), { expect: 'Location', companyId: CO, locationId: LOC }, 'invalid_scope'],
  ['non-string refresh token', locResp({ refresh_token: 7 }), { expect: 'Location', companyId: CO, locationId: LOC }, 'invalid_refresh_token'],
  ['malformed id in response', locResp({ locationId: 'bad id/../x' }), { expect: 'Location', companyId: CO, locationId: LOC }, 'location_mismatch'],
  ['array body', [], { expect: 'Location', companyId: CO, locationId: LOC }, 'invalid_response'],
] as const) {
  Deno.test(`validate rejects: ${name}`, async () => {
    assertEquals(await code(Promise.resolve().then(() => validateTokenResponse(body, ctx as never, NOW, 'native_location'))), want);
  });
}

// ---------- exchange ----------
Deno.test('exchange: deterministic request to fixed origin, form body, Version header, manual redirect', async () => {
  const { t, calls } = rec(200, locResp());
  const d = await exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC });
  assertEquals(calls.length, 1);
  const r = calls[0];
  assertEquals(r.url, `${GHL_ORIGIN}${LOCATION_TOKEN_PATH}`);
  assertEquals(r.method, 'POST'); assertEquals(r.redirect, 'manual');
  assertEquals(r.headers['Version'], API_VERSION);
  assertEquals(r.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assertEquals(r.headers['Authorization'], `Bearer parent-at-${SECRET}`);
  assertEquals(r.body, `companyId=${CO}&locationId=${LOC}`);
  assertEquals(d.mode, 'derived_location');
  assertEquals(d.refreshToken, `loc-rt-${SECRET}`);
});
Deno.test('exchange: no refresh_token returned => access-only derived, never parent refresh token', async () => {
  const { t } = rec(200, locResp({ refresh_token: undefined }));
  const d = await exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC });
  assertEquals(d.mode, 'derived_location'); assertEquals(d.refreshToken, null);
  assert(!JSON.stringify(d).includes('parent-rt'));
});
Deno.test('exchange: refresh_token identical to parent refresh token is rejected (pair integrity)', async () => {
  const { t } = rec(200, locResp({ refresh_token: `parent-rt-${SECRET}` }));
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC })), 'refresh_pair_integrity');
});
Deno.test('exchange: requires company_parent mode', async () => {
  const { t, calls } = rec(200, locResp());
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent({ mode: 'native_location', locationId: LOC }), { companyId: CO, locationId: LOC })), 'wrong_mode');
  assertEquals(calls.length, 0);
});
Deno.test('exchange: binding company must equal parent company (no request sent)', async () => {
  const { t, calls } = rec(200, locResp());
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: 'OtherCompany01', locationId: LOC })), 'company_mismatch');
  assertEquals(calls.length, 0);
});
Deno.test('exchange: malformed binding ids rejected before request', async () => {
  const { t, calls } = rec(200, locResp());
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: 'x&companyId=evil' })), 'invalid_binding');
  assertEquals(calls.length, 0);
});
Deno.test('exchange: expired parent rejected before request', async () => {
  const { t, calls } = rec(200, locResp());
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent({ expiresAt: NOW - 1 }), { companyId: CO, locationId: LOC })), 'parent_expired');
  assertEquals(calls.length, 0);
});
Deno.test('exchange: response for a different location rejected', async () => {
  const { t } = rec(200, locResp({ locationId: 'OtherLocation01' }));
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC })), 'location_mismatch');
});
Deno.test('exchange: 3xx redirect rejected', async () => {
  const { t } = rec(302, '', { headers: { location: 'https://evil.example/' } });
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC })), 'redirect_blocked');
});
Deno.test('exchange: transport that followed a redirect / changed origin is rejected', async () => {
  const { t } = rec(200, locResp(), { redirected: true, url: 'https://evil.example/oauth/locationToken' });
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC })), 'redirect_blocked');
});
Deno.test('exchange: provider error status => provider_error without echoing body secrets', async () => {
  const { t } = rec(401, { message: `nope ${SECRET}` });
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC })), 'provider_error');
});
Deno.test('exchange: non-JSON body', async () => {
  const { t } = rec(200, `<html>${SECRET}</html>`);
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC })), 'invalid_response');
});
Deno.test('exchange: transport throw is wrapped and sanitized', async () => {
  const t: Transport = () => Promise.reject(new Error(`socket ${SECRET}`));
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC })), 'transport_failed');
});

// ---------- refresh ----------
const derived = (o: Partial<Credential> = {}): Credential => ({
  mode: 'derived_location', accessToken: `loc-at-${SECRET}`, refreshToken: `loc-rt-${SECRET}`,
  expiresAt: NOW - 1, scopes: ['contacts.readonly'], companyId: CO, locationId: LOC, ...o,
});
Deno.test('refresh: derived location uses its own refresh token, user_type=Location, fixed origin', async () => {
  const { t, calls } = rec(200, locResp({ access_token: 'new-at', refresh_token: 'new-rt' }));
  const n = await refreshCredential(deps(t), CLIENT, derived());
  const r = calls[0];
  assertEquals(r.url, `${GHL_ORIGIN}${OAUTH_TOKEN_PATH}`); assertEquals(r.redirect, 'manual');
  const p = new URLSearchParams(r.body);
  assertEquals(p.get('grant_type'), 'refresh_token'); assertEquals(p.get('user_type'), 'Location');
  assertEquals(p.get('refresh_token'), `loc-rt-${SECRET}`);
  assertEquals(r.headers['Authorization'], undefined);
  assertEquals(n.mode, 'derived_location'); assertEquals(n.refreshToken, 'new-rt'); assertEquals(n.locationId, LOC);
});
Deno.test('refresh: company parent uses user_type=Company and must stay Company', async () => {
  const { t, calls } = rec(200, locResp({ userType: 'Company', locationId: undefined, refresh_token: 'new-rt' }));
  const n = await refreshCredential(deps(t), CLIENT, parent());
  assertEquals(new URLSearchParams(calls[0].body).get('user_type'), 'Company');
  assertEquals(n.mode, 'company_parent');
});
Deno.test('refresh: access-only derived credential cannot refresh (must re-derive from parent)', async () => {
  const { t, calls } = rec(200, locResp());
  assertEquals(await code(refreshCredential(deps(t), CLIENT, derived({ refreshToken: null }))), 'not_refreshable');
  assertEquals(calls.length, 0);
});
Deno.test('refresh: response missing new refresh token is rejected (rotation required)', async () => {
  const { t } = rec(200, locResp({ refresh_token: undefined }));
  assertEquals(await code(refreshCredential(deps(t), CLIENT, derived())), 'refresh_pair_integrity');
});
Deno.test('refresh: response that changes class is rejected', async () => {
  const { t } = rec(200, locResp({ userType: 'Company', locationId: undefined }));
  assertEquals(await code(refreshCredential(deps(t), CLIENT, derived())), 'wrong_class');
});
Deno.test('refresh: response for another location rejected', async () => {
  const { t } = rec(200, locResp({ locationId: 'OtherLocation01' }));
  assertEquals(await code(refreshCredential(deps(t), CLIENT, derived())), 'location_mismatch');
});
Deno.test('refresh: redirect blocked', async () => {
  const { t } = rec(307, '');
  assertEquals(await code(refreshCredential(deps(t), CLIENT, derived())), 'redirect_blocked');
});
Deno.test('refresh: incoherent credential (derived without location) rejected', async () => {
  const { t, calls } = rec(200, locResp());
  assertEquals(await code(refreshCredential(deps(t), CLIENT, derived({ locationId: null }))), 'incoherent_credential');
  assertEquals(calls.length, 0);
});

// ---------- no destination override surface ----------
Deno.test('API surface exposes no origin/url override', async () => {
  const { t, calls } = rec(200, locResp());
  // extra properties are ignored; origin is a module constant
  await exchangeCompanyForLocation({ ...deps(t), origin: 'https://evil.example', url: 'https://evil.example' } as never, parent(), { companyId: CO, locationId: LOC });
  assert(calls[0].url.startsWith(GHL_ORIGIN + '/'));
});
Deno.test('constants pinned', () => {
  assertEquals(GHL_ORIGIN, 'https://services.leadconnectorhq.com');
  assertEquals(LOCATION_TOKEN_PATH, '/oauth/locationToken');
  assertEquals(OAUTH_TOKEN_PATH, '/oauth/token');
  assertEquals(API_VERSION, '2021-07-28');
});
```
