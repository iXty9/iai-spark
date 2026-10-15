# GHL Company→Location core — code-only review artifact (rev 2, focused correction)

Status: REVIEW ONLY. Nothing deployed; no Supabase function/config/migration/frontend/n8n files touched; no provider calls; no token/secret/database access; diagnostic not rerun. Source lives only in this document and scratch `/tmp/ghlcore/`. Fake IDs/credentials and injected transport only. Rev 2 corrects the rev-1 module in place (not replaced) for nine fail-closed regressions and corrects §3/§4 claims.

## 1. Contract evidence (official HighLevel docs, fetched 2026-10-15)

| Item | 2021-07-28 (chosen) | v3 (not used) |
|---|---|---|
| Source | https://marketplace.gohighlevel.com/docs/2021-07-28/ghl/oauth/get-location-access-token | https://marketplace.gohighlevel.com/docs/ghl/oauth/get-location-access-token |
| URL / method | `POST https://services.leadconnectorhq.com/oauth/locationToken` | `POST https://services.leadconnectorhq.com/oauth/location-token` |
| Version header | `2021-07-28` | `v3` |
| Body | form-urlencoded `companyId`, `locationId` | same |
| Auth | `Bearer` Agency (Company) token | same |
| Response | `access_token`, `token_type`, `expires_in`, `scope`, `locationId`, `userId`, `planId`, `appId`, `versionId`, `refresh_token` (described as for "this specific location"); no `userType`/`companyId` listed | same |

**Grant citation (corrects rev 1).** The endpoint reference pages do not visibly name the scope. The authoritative mapping is the Scopes page, https://marketplace.gohighlevel.com/docs/Authorization/Scopes, table row (verbatim, retrieved 2026-10-15 17:1x UTC via `curl`): `oauth.write | POST /oauth/locationToken | | Agency` (adjacent row: `oauth.readonly | GET /oauth/installedLocations | | Agency`). The core enforces, before dispatch, that the parent credential's **provider-reported** scope list (the `scope` string returned when that credential was issued/refreshed, captured by `validateTokenResponse`) contains `oauth.write`; otherwise `grant_missing`. This is a precondition, not proof: it does not show the provider will honor the grant for the already-issued live token. Live grant confirmation stays a separate gate and must not re-read/decrypt the token.

Refresh: https://marketplace.gohighlevel.com/docs/2021-07-28/ghl/oauth/get-access-token — `POST /oauth/token`, `grant_type=refresh_token`, `user_type` ∈ {Company, Location}, response includes `userType`. OAuth guide §6: refresh tokens are single-use; each refresh returns a new one. Route pairing (camelCase+2021-07-28 vs hyphenated+v3) and form encoding follow the versioned reference; the guide's JSON sample is non-normative. This is a code-only choice, not live compatibility proof.

**Evidence gaps:** live honoring of `oauth.write` on the current token; refreshing a derived Location refresh token via `/oauth/token` is implied, not shown by a worked example.

## 2. Credential modes and invariants (enforced at runtime)
| Mode | Expected class | `locationId` | `refreshToken` | `userType` in response |
|---|---|---|---|---|
| `native_location` | Location | required ID | **required** | **required** |
| `company_parent` | Company | must be `null` | **required** | **required** |
| `derived_location` | Location | required ID | may be `null` (access-only) | required from `/oauth/token`; absent allowed **only** on the pinned exchange response (internal source flag, not a caller option) |

Any other mode/class/location combination → `mode_mismatch` / `invalid_context`. Deserialized credentials and bindings are type-checked at runtime (string IDs, mode allowlist, token fields, finite `expiresAt`, string-array scopes) before any dispatch; IDs are rejected, never trimmed or invented.

## 3. Integration boundaries (NOT implemented by this artifact)
- `CredentialStore`, coordinator and caller auth are **not** implemented here.
- Refresh serialization: a compare-and-swap on `last_refresh_at` alone is **not** adequate. The existing plan's requirements stand: one single-writer manager per installation with a monotonic credential generation, and durable recovery for ambiguous rotation. The core is stateless and must only be called by that manager.
- Durable capture: any provider response that may have rotated the refresh token must be durably captured (encrypted) **before** validation/persistence outcome is decided. If validation or persistence then fails, the old pair must be treated as possibly spent — never described as "safely restored". Recovery is a manager obligation: no blind retry, no discard.
- `rotation_ambiguous` (same refresh token returned) is an unverified rotation outcome, not success; it falls under the same recovery obligation.
- `CallerAuth` replacement for `x-ixty-proxy-secret` + body `user_id` (hardening finding 1); endpoint/method allowlist (findings 2–3).

Later integration points (each via the manager): `ghl-oauth-callback`, `ghl-api-proxy` lazy refresh, `ghl-token-refresh`, `ghl-token-refresh-cron`.

`invalid_grant` handling (corrects rev 1): do **not** map every `invalid_grant` to `expired`. Revocation/uninstall, spent refresh token, concurrent-rotation race/ambiguous rotation, and other causes need distinct, safe states and human review; no auto-reconnect and no refresh loop.

## 4. Remaining approval gates
Schema migration (mode/linkage/class/generation columns); manager + store + coordinator; redeploys of the four functions; live `oauth.write` confirmation; one supervised live exchange; Phases 2–7. (Rev 1's "reconnect of the inactive location" is withdrawn: inactivity of the current row was never established, and the Company-token diagnostic does not justify reinstall/reconnect.) Diagnostic remains deployed, untouched, not rerun.

## 5. Findings → regressions
| Finding | Test(s) | New code |
|---|---|---|
| 1 native Location missing refresh_token | R1 | `missing_refresh_token` |
| 2 Company parent missing refresh_token | R2 (R2b guard: derived access-only still allowed) | `missing_refresh_token` |
| 3–4 missing userType | R3, R4, R4b (R4c guard: exchange contract omission allowed) | `wrong_class` |
| 5 impossible mode/class/location | R5 | `mode_mismatch` / `invalid_context` |
| 6 undefined IDs coerced by RegExp | R6, R6b (0 transport calls) | `incoherent_credential` / `invalid_binding` |
| 7 exchange without oauth.write | R7 (0 transport calls) | `grant_missing` |
| 8 unchanged refresh token | R8 | `rotation_ambiguous` |
| 9 NaN / invalid status / response shape | R9 | `invalid_response` |

## 6. Test sequence (actual output)
Runtime: `deno 2.6.10 (stable) v8 14.5.201.2-rusty typescript 5.9.2`. cwd `/tmp/ghlcore`.

RED — new test file against the unchanged rev-1 core (SHA-256 `c25400c9e1a896656f1ac978afae17390f440fef9b789811b49ea0dd9949c069`), `deno test token-core.test.ts`:
```text
R1 native_location requires its own refresh_token ... FAILED (0ms)
R2 company_parent requires its own refresh_token ... FAILED (0ms)
R2b only derived_location may be access-only ... ok (0ms)
R3 native_location requires userType ... FAILED (0ms)
R4 company_parent requires userType ... FAILED (0ms)
R4b token-endpoint validation of derived_location also requires userType (no caller escape hatch) ... FAILED (0ms)
R4c exchange (pinned contract omits userType) accepts absent userType ... ok (0ms)
R5 impossible mode/class/location combinations rejected ... FAILED (0ms)
R6 runtime preflight: undefined companyId on parent+binding rejected before dispatch ... FAILED (0ms)
R6b runtime preflight: malformed credential fields rejected before dispatch (no normalization) ... FAILED (0ms)
R7 exchange requires provider-reported oauth.write on parent before dispatch ... FAILED (0ms)
R8 refresh returning the unchanged old refresh token => rotation_ambiguous, not success ... FAILED (0ms)
R9 non-finite / non-integer / out-of-range HTTP status rejected ... FAILED (0ms)
FAILED | 44 passed | 11 failed (25ms)
```
(R2b and R4c are positive guard tests and pass on both.)

GREEN — corrected core, type-checked, `deno test token-core.test.ts`:
```text
Check token-core.test.ts
running 55 tests from ./token-core.test.ts
validate: native Location response ok ... ok (1ms)
validate: Company response ok ... ok (0ms)
validate rejects: unknown class ... ok (0ms)
validate rejects: wrong class (Company when Location expected) ... ok (0ms)
validate rejects: location mismatch ... ok (0ms)
validate rejects: location missing ... ok (0ms)
validate rejects: company mismatch ... ok (0ms)
validate rejects: company response carrying locationId ... ok (0ms)
validate rejects: missing access token ... ok (1ms)
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
exchange: deterministic request to fixed origin, form body, Version header, manual redirect ... ok (0ms)
exchange: no refresh_token returned => access-only derived, never parent refresh token ... ok (0ms)
exchange: refresh_token identical to parent refresh token is rejected (pair integrity) ... ok (0ms)
exchange: requires company_parent mode ... ok (0ms)
exchange: binding company must equal parent company (no request sent) ... ok (0ms)
exchange: malformed binding ids rejected before request ... ok (0ms)
exchange: expired parent rejected before request ... ok (0ms)
exchange: response for a different location rejected ... ok (0ms)
exchange: 3xx redirect rejected ... ok (0ms)
exchange: transport that followed a redirect / changed origin is rejected ... ok (1ms)
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
R1 native_location requires its own refresh_token ... ok (0ms)
R2 company_parent requires its own refresh_token ... ok (0ms)
R2b only derived_location may be access-only ... ok (0ms)
R3 native_location requires userType ... ok (0ms)
R4 company_parent requires userType ... ok (0ms)
R4b token-endpoint validation of derived_location also requires userType (no caller escape hatch) ... ok (0ms)
R4c exchange (pinned contract omits userType) accepts absent userType ... ok (0ms)
R5 impossible mode/class/location combinations rejected ... ok (0ms)
R6 runtime preflight: undefined companyId on parent+binding rejected before dispatch ... ok (0ms)
R6b runtime preflight: malformed credential fields rejected before dispatch (no normalization) ... ok (0ms)
R7 exchange requires provider-reported oauth.write on parent before dispatch ... ok (0ms)
R8 refresh returning the unchanged old refresh token => rotation_ambiguous, not success ... ok (0ms)
R9 non-finite / non-integer / out-of-range HTTP status rejected ... ok (0ms)

ok | 55 passed | 0 failed (31ms)
```
Original 42 tests are unchanged in content and all pass.

## 7. Full SHA-256 of tested bytes
```text
7d4b2ac0aff6a2aba4df5777719aef75b4b909c9c9c07596dd16c9170d47c52f  token-core.ts
35692dd65609daa4192fb4c21d01613303c731f03a001760878363d7e6f0138a  token-core.test.ts
```

## 8. Proposed source — future path `supabase/functions/_shared/ghl-token-core.ts`
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
/** Scopes page (marketplace.gohighlevel.com/docs/Authorization/Scopes): oauth.write -> POST /oauth/locationToken, Agency. */
export const REQUIRED_EXCHANGE_SCOPE = 'oauth.write';
const MODES = ['native_location', 'company_parent', 'derived_location'] as const;
/** Mode fixes expected class and location shape. */
const MODE_CLASS: Record<Mode, UserType> = { native_location: 'Location', company_parent: 'Company', derived_location: 'Location' };

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
export interface ValidateCtx { expect: UserType; companyId: string; locationId: string | null }
/** Which pinned provider contract produced the body. Internal only: not a caller option. */
type Source = 'token_endpoint' | 'location_exchange';

/** Error carrying only a fixed code. Never includes tokens, bodies or provider messages. */
export class CoreError extends Error {
  constructor(public readonly code: string, public readonly status?: number) { super(code); this.name = 'CoreError'; }
  toJSON() { return { code: this.code, status: this.status ?? null }; }
}
const fail = (code: string, status?: number): never => { throw new CoreError(code, status); };
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 16384;
const isId = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v);
const isMode = (v: unknown): v is Mode => typeof v === 'string' && (MODES as readonly string[]).includes(v);

/** Validate a /oauth/token response (native or refresh). userType and, except derived_location, refresh_token are mandatory. */
export function validateTokenResponse(raw: unknown, ctx: ValidateCtx, nowMs: number, mode: Mode): Credential {
  return validate(raw, ctx, nowMs, mode, 'token_endpoint');
}

function validate(raw: unknown, ctx: ValidateCtx, nowMs: number, mode: Mode, source: Source): Credential {
  if (!isMode(mode) || !isObj(ctx)) fail('mode_mismatch');
  if (!isId(ctx.companyId)) fail('invalid_context');
  if (ctx.expect === 'Location' ? !isId(ctx.locationId) : ctx.locationId !== null) fail('invalid_context');
  if (source === 'location_exchange' && mode !== 'derived_location') fail('mode_mismatch');
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) fail('invalid_context');
  if (!isObj(raw)) fail('invalid_response');
  const b = raw as Record<string, unknown>;
  if (!nonEmpty(b.access_token)) fail('invalid_access_token');
  if (b.token_type !== undefined && (typeof b.token_type !== 'string' || b.token_type.toLowerCase() !== 'bearer')) fail('invalid_token_type');
  if (typeof b.expires_in !== 'number' || !Number.isFinite(b.expires_in) || b.expires_in <= 0 || b.expires_in > MAX_EXPIRES_IN) fail('invalid_expiry');
  if (!nonEmpty(b.scope)) fail('invalid_scope');
  if (b.refresh_token !== undefined && b.refresh_token !== null && !nonEmpty(b.refresh_token)) fail('invalid_refresh_token');

  // Pair: only derived_location (produced by exchange or its refresh) may be access-only.
  if (mode !== 'derived_location' && !nonEmpty(b.refresh_token)) fail('missing_refresh_token');
  // Class: mandatory everywhere except the pinned exchange contract, which omits userType.
  const classOptional = source === 'location_exchange';
  if (!(classOptional && b.userType === undefined) && b.userType !== ctx.expect) fail('wrong_class');
  if (b.companyId !== undefined && b.companyId !== ctx.companyId) fail('company_mismatch');
  if (ctx.expect === 'Location') {
    if (typeof b.locationId !== 'string' || !ID_RE.test(b.locationId) || b.locationId !== ctx.locationId) fail('location_mismatch');
  } else if (b.locationId !== undefined && b.locationId !== null) {
    fail('location_mismatch'); // Company credential must not silently carry a location binding
  }
  // Bind mode <-> expected class only after body/class/location checks so each defect keeps its own code.
  if (ctx.expect !== MODE_CLASS[mode]) fail('mode_mismatch');
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
  if (!isObj(res) || typeof res.status !== 'number' || !Number.isInteger(res.status) || res.status < 100 || res.status > 599 ||
      typeof res.redirected !== 'boolean' || typeof res.url !== 'string') fail('invalid_response');
  if (res.redirected || (res.status >= 300 && res.status < 400) || res.url !== url) fail('redirect_blocked', res.status);
  if (res.status < 200 || res.status >= 300) fail('provider_error', res.status);
  if (typeof res.bodyText !== 'string' || res.bodyText.length > MAX_BODY) fail('invalid_response');
  try { return JSON.parse(res.bodyText); } catch { return fail('invalid_response'); }
}

/** Runtime preflight: never trust TS types on deserialized input; reject, never normalize. */
function assertCoherent(c: Credential) {
  if (!isObj(c) || !isMode(c.mode)) fail('incoherent_credential');
  if (!isId(c.companyId)) fail('incoherent_credential');
  if (c.mode === 'company_parent' ? c.locationId !== null : !isId(c.locationId)) fail('incoherent_credential');
  if (!nonEmpty(c.accessToken)) fail('incoherent_credential');
  if (c.refreshToken !== null && !nonEmpty(c.refreshToken)) fail('incoherent_credential');
  if (c.mode !== 'derived_location' && c.refreshToken === null) fail('incoherent_credential');
  if (typeof c.expiresAt !== 'number' || !Number.isFinite(c.expiresAt)) fail('incoherent_credential');
  if (!Array.isArray(c.scopes) || !c.scopes.every((x) => typeof x === 'string')) fail('incoherent_credential');
}

/** Company access token -> Location credential for one server-bound (companyId, locationId). */
export async function exchangeCompanyForLocation(d: CoreDeps, parent: Credential, binding: Binding): Promise<Credential> {
  assertCoherent(parent);
  if (parent.mode !== 'company_parent') fail('wrong_mode');
  if (!isObj(binding) || !isId(binding.companyId) || !isId(binding.locationId)) fail('invalid_binding');
  // Precondition on the provider-reported scope of THIS issued credential. Not proof of the live grant.
  if (!parent.scopes.includes(REQUIRED_EXCHANGE_SCOPE)) fail('grant_missing');
  if (binding.companyId !== parent.companyId) fail('company_mismatch');
  if (!(parent.expiresAt > d.now())) fail('parent_expired');
  const body = new URLSearchParams({ companyId: binding.companyId, locationId: binding.locationId }).toString();
  const json = await send(d, LOCATION_TOKEN_PATH, { Authorization: `Bearer ${parent.accessToken}` }, body);
  const c = validate(json, { expect: 'Location', companyId: binding.companyId, locationId: binding.locationId }, d.now(), 'derived_location', 'location_exchange');
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
  const c = validate(json, { expect: userType, companyId: cred.companyId, locationId: cred.locationId }, d.now(), cred.mode, 'token_endpoint');
  if (c.refreshToken === null) fail('refresh_pair_integrity'); // documented rotation: new refresh token always returned
  // Same token back: rotation outcome unverified. Old token may already be consumed; caller must
  // durably record this and recover under the single-writer manager. No blind retry, no discard.
  if (c.refreshToken === cred.refreshToken) fail('rotation_ambiguous');
  return c;
}
```

## 9. Tests — future path `supabase/functions/_shared/ghl-token-core.test.ts` (import `./ghl-token-core.ts`)
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

// ---------- Regressions R1–R9 (focused correction request, 2026-10-15) ----------
const LCTX = { expect: 'Location', companyId: CO, locationId: LOC } as const;
const CCTX = { expect: 'Company', companyId: CO, locationId: null } as const;
const coResp = (o: Record<string, unknown> = {}) => locResp({ userType: 'Company', locationId: undefined, ...o });
const v = (f: () => unknown) => code(Promise.resolve().then(f));

Deno.test('R1 native_location requires its own refresh_token', async () => {
  assertEquals(await v(() => validateTokenResponse(locResp({ refresh_token: undefined }), LCTX, NOW, 'native_location')), 'missing_refresh_token');
});
Deno.test('R2 company_parent requires its own refresh_token', async () => {
  assertEquals(await v(() => validateTokenResponse(coResp({ refresh_token: undefined }), CCTX, NOW, 'company_parent')), 'missing_refresh_token');
});
Deno.test('R2b only derived_location may be access-only', () => {
  const c = validateTokenResponse(locResp({ refresh_token: undefined }), LCTX, NOW, 'derived_location');
  assertEquals(c.refreshToken, null);
});
Deno.test('R3 native_location requires userType', async () => {
  assertEquals(await v(() => validateTokenResponse(locResp({ userType: undefined }), LCTX, NOW, 'native_location')), 'wrong_class');
});
Deno.test('R4 company_parent requires userType', async () => {
  assertEquals(await v(() => validateTokenResponse(coResp({ userType: undefined }), CCTX, NOW, 'company_parent')), 'wrong_class');
});
Deno.test('R4b token-endpoint validation of derived_location also requires userType (no caller escape hatch)', async () => {
  assertEquals(await v(() => validateTokenResponse(locResp({ userType: undefined }), LCTX, NOW, 'derived_location')), 'wrong_class');
});
Deno.test('R4c exchange (pinned contract omits userType) accepts absent userType', async () => {
  const { t } = rec(200, locResp({ userType: undefined }));
  const d = await exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC });
  assertEquals(d.mode, 'derived_location');
});
Deno.test('R5 impossible mode/class/location combinations rejected', async () => {
  assertEquals(await v(() => validateTokenResponse(locResp(), LCTX, NOW, 'company_parent')), 'mode_mismatch');
  assertEquals(await v(() => validateTokenResponse(coResp(), CCTX, NOW, 'native_location')), 'mode_mismatch');
  assertEquals(await v(() => validateTokenResponse(locResp(), { expect: 'Location', companyId: CO, locationId: null } as never, NOW, 'native_location')), 'invalid_context');
  assertEquals(await v(() => validateTokenResponse(coResp(), { expect: 'Company', companyId: CO, locationId: LOC } as never, NOW, 'company_parent')), 'invalid_context');
  assertEquals(await v(() => validateTokenResponse(locResp(), LCTX, NOW, 'bogus' as never)), 'mode_mismatch');
});
Deno.test('R6 runtime preflight: undefined companyId on parent+binding rejected before dispatch', async () => {
  const { t, calls } = rec(200, locResp({ companyId: undefined }));
  const p = parent({ companyId: undefined as unknown as string });
  assertEquals(await code(exchangeCompanyForLocation(deps(t), p, { companyId: undefined as unknown as string, locationId: LOC })), 'incoherent_credential');
  assertEquals(calls.length, 0);
  const { t: t2, calls: c2 } = rec(200, locResp());
  assertEquals(await code(exchangeCompanyForLocation(deps(t2), parent(), { companyId: undefined as unknown as string, locationId: LOC })), 'invalid_binding');
  assertEquals(c2.length, 0);
});
Deno.test('R6b runtime preflight: malformed credential fields rejected before dispatch (no normalization)', async () => {
  for (const bad of [
    { accessToken: undefined as unknown as string }, { refreshToken: 5 as unknown as string },
    { expiresAt: Number.NaN }, { scopes: 'oauth.write' as unknown as string[] },
    { mode: 'bogus' as never }, { companyId: ` ${CO}` },
  ]) {
    const { t, calls } = rec(200, locResp());
    const c = await code(exchangeCompanyForLocation(deps(t), parent(bad), { companyId: CO, locationId: LOC }));
    assert(['incoherent_credential', 'wrong_mode'].includes(c), c);
    assertEquals(calls.length, 0);
  }
  const { t, calls } = rec(200, locResp());
  assertEquals(await code(refreshCredential(deps(t), CLIENT, parent({ companyId: undefined as unknown as string }))), 'incoherent_credential');
  assertEquals(calls.length, 0);
});
Deno.test('R7 exchange requires provider-reported oauth.write on parent before dispatch', async () => {
  const { t, calls } = rec(200, locResp());
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent({ scopes: ['contacts.readonly'] }), { companyId: CO, locationId: LOC })), 'grant_missing');
  assertEquals(calls.length, 0);
});
Deno.test('R8 refresh returning the unchanged old refresh token => rotation_ambiguous, not success', async () => {
  const { t } = rec(200, locResp({ refresh_token: `parent-rt-${SECRET}` }));
  const cred = parent({ mode: 'native_location', locationId: LOC });
  assertEquals(await code(refreshCredential(deps(t), CLIENT, cred)), 'rotation_ambiguous');
});
Deno.test('R9 non-finite / non-integer / out-of-range HTTP status rejected', async () => {
  for (const s of [Number.NaN, Infinity, 200.5, 99, 600, '200' as unknown as number]) {
    const { t } = rec(s, locResp());
    assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC })), 'invalid_response');
  }
  const { t } = rec(200, locResp(), { redirected: undefined as unknown as boolean });
  assertEquals(await code(exchangeCompanyForLocation(deps(t), parent(), { companyId: CO, locationId: LOC })), 'invalid_response');
});
```
