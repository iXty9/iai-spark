# HighLevel OAuth hardening: reviewed plan (design only)

This plan responds to the backend developer's request. Nothing gets deployed, migrated, reconnected or refreshed until you approve each phase. I agree with most of the request. The points where I disagree or add something are marked **Position**.

## 0. Corrected findings
- **Confirmed gaps in the code:** no check of `userType` on any token response. No location-token exchange. No stored token class. `ghl-oauth-callback` trusts `body.userId` and runs with `verify_jwt=false`. When the location is missing, it falls back to the newest pending install anywhere in the system. `ghl-token-refresh-cron` has no check on who is calling it. `ghl-token-refresh` takes `userId` from the request body. Three separate pieces of code refresh tokens with no coordination.
- **Not yet confirmed:** that the stored token is a Company token. The 401 "authClass" error points that way, but the first step is to read the real `userType` (see phase 1).
- **Position:** the failing location `YZQCL96jxM5knY233VD4` is a separate problem. HighLevel answered `invalid_grant: Location is not active`, so its refresh token is dead whatever its class. Fixing token classes will not bring it back. A new install is required, and it should happen after phase 2 so the new tokens are stored correctly.
- Correction to the earlier examples: `base + '//x'` keeps the HighLevel origin, while `base + '@x'` changes it. Whether redirects forward the auth header will be tested, not assumed. The proxy will reject redirects in all cases (`redirect: 'manual'`).

## Phase 1: Read-only diagnosis (no side effects)
- Add a small admin-only check that decodes the stored access token's claims without calling HighLevel or refreshing anything. It reports `authClass`/`userType`, company, location and expiry, and never returns the token itself.
- List every caller of `ghl-api-proxy` (n8n workflows that send `x-ixty-proxy-secret`, plus anything else) before changing the proxy.

## Phase 2: Additive schema (old code keeps working)
- `ghl_installations`: add `token_user_type` (`Location` | `Company` | `unknown`, default `unknown`; existing rows are never bulk-labeled). Also add `token_scopes_verified`, `refresh_lease_until`, `refresh_lease_owner` and `token_generation`.
- New service-only table `ghl_company_credentials` (RLS on, no policies). It stores a complete Company token pair with its own expiry, and only when an exchange needs it. **Position:** keep it only if phase 1 shows Company installs are real. Otherwise skip it.
- New service-only table `ghl_oauth_transactions`. It holds a one-time state value and links the signed-in user to the expected company and location. It expires after 10 minutes and has a `consumed_at` field.
- Feature gate in `app_settings`: `ghl_oauth_v2_enabled` (default false) and `ghl_oauth_v2_pilot_locations` (allowlist).

## Phase 3: Callback identity and location binding
- The callback checks the caller's sign-in session itself and gets the user ID from it. It ignores `body.userId`.
- **In-app connect:** the server creates a transaction and its state value. The callback must receive a matching state that is unexpired and unused, then marks it consumed. Anything else is rejected.
- **Marketplace install:** these arrive without our state value. **Position:** use a claim instead of a nonce. The install webhook writes a pending record with company and location. The callback only binds to a pending record if the token's own `companyId`/`locationId` match it exactly. If more than one record matches, or the match is unclear, the user sees "reinstall from Marketplace." The global "newest pending install" fallback is removed. Both ways of connecting keep working.
- **Ownership:** the upsert may not move a location already owned by another user. That returns a 409, and only an admin can reassign it.

## Phase 4: One token lifecycle (`_shared/ghl-token-manager.ts`)
- Every token response is checked for `userType`, `companyId`, `locationId`, `scope`, `expires_in`, and that `access_token`/`refresh_token` are present. If the class is unknown, data is missing, or the values conflict, it fails closed: last good credentials stay in place and nothing is marked connected.
- **Location response:** the company and location must match the binding. The complete pair from that response is stored.
- **Company response:** call `POST /oauth/locationToken` (Version 2021-07-28) for the bound location. The result must be Location class with the right location and required scopes. Whether that response includes its own refresh token is checked in phase 1 and the sandbox. If it does not, the Location token is never paired with the Company refresh token. Instead, the manager mints a fresh Location token from the stored Company pair when needed.
- **Serialized refresh:** a database lease function `claim_ghl_refresh_lease(installation_id, owner, ttl)` uses an atomic UPDATE with expiry. Only the lease holder calls HighLevel. Others wait, then read the result again. The write is conditional on `token_generation`. If the database write fails after HighLevel has already rotated the token, the new pair is kept in memory and retried, and a `refresh_write_failed` error is logged without any secrets. A lease that runs out recovers automatically.
- `ghl-api-proxy`, `ghl-token-refresh` and `ghl-token-refresh-cron` all call this manager. The three copies of the refresh code are deleted.
- **Caller checks:** `ghl-token-refresh` takes the user ID from the sign-in session only (admins may name another user). The cron requires a dedicated `GHL_CRON_SECRET` header, compared in constant time. The cron job's SQL is updated to send that header.
- `invalid_grant` marks the connection `expired` and sets `refresh_error = 'reinstall_required'` (this comes from the earlier plan).

## Phase 5: Proxy hardening
- Fixed origin built with `new URL(path, 'https://services.leadconnectorhq.com')`. The final origin must be the HighLevel origin. Requests with `@`, `\`, `..`, encoded `%2e`/`%2f`, a full URL or `//` are rejected.
- Exact method-plus-path allowlist (for example `POST /contacts/search`, `GET /contacts/{id}`). Destructive or money-related operations (deletes, invoices/payments POST) require a per-caller capability flag.
- **Caller authorization:** each n8n consumer gets a scoped capability record (key hash, allowed user IDs or installations, allowed operations). This replaces the one shared secret that can act as any `user_id`. **Position:** the old secret keeps working only for pilot-excluded installs during the transition, then is retired. This keeps current n8n workflows running without editing them.

## Phase 6: Rollback and recovery
- Before each phase, the affected `ghl_installations` rows are copied into a protected service-only backup table (encrypted values as they are).
- Code rollback = turn the feature gate off. The old code then reads the **newest** token pair that the new code wrote. Old refresh tokens are never restored, and error evidence is never erased.
- Installs with unknown or lost credentials: they are marked `reinstall_required`, the Integrations card shows "Reconnect," and admins see it in Admin > HighLevel. A known Company token is never sent to Location-only endpoints.
- `YZQCL96jxM5knY233VD4`: reinstall after phase 3 is live, as a pilot location. The two Feb-2026 error rows stay as they are until you decide what to do with them.

## Phase 7: Tests and pilot
- Offline Deno tests with a mocked HighLevel. They cover Location and Company responses, missing or unexpected class, wrong company, location or user, missing, bad or replayed state, unclear pending records, ownership moves, pair integrity, missing refresh token, concurrent refresh, rotation with a failed write, unauthorized cron and manual calls, harmful paths and redirects, 401/403 scope errors, and a check that no logs or results contain secrets.
- Pilot: one location from the allowlist. Proof is a read-only `POST /contacts/search` and `GET /contacts/{id}`, with the execution and stored record read back. No changes to n8n workflow activation, credentials, endpoints or production publishing.

## Technical details
- Files: `ghl-oauth-callback`, `ghl-api-proxy`, `ghl-token-refresh`, `ghl-token-refresh-cron`, `ghl-install-webhook` (pending claim fields), new `_shared/ghl-token-manager.ts`, `_shared/ghl-proxy-allowlist.ts`, `HighLevelConnectionCard.tsx` (start connect through the server-issued state, show Reconnect), `HighLevelSettings.tsx` (class and status columns).
- Edits will be made against the real repository files, not the shortened excerpts in the report.
- Each phase is approved separately. Phases 1–2 have no effect on how the app behaves.
