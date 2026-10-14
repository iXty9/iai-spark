# HighLevel OAuth: read-only diagnosis results (phase 1 only)

Nothing was changed, refreshed, reconnected or deployed. Migrations, token changes, secret changes and phases 2–7 are on hold until you approve them separately.

## 1. Evidence for the original inactive location / invalid_grant: correction needed
The original record no longer exists, so the exact evidence you asked for cannot be produced.
- The database now has **one** HighLevel row:
  - installation `7a1087ef-bcae-4331-85dd-372197f1fd05`, location `YZQCL96jxM5knY233VD4`, company `SiG1HYqc0WPja7ASTTAV`, user `5519f7f8-2619-43a1-99d7-bb1d1cc1d0d2`
  - `created_at` 2026-10-12 13:32:06 UTC, `connected_at` 13:32:42 UTC, status `connected`, `refresh_error` empty
  - `last_refresh_at` 2026-10-14 12:00:03 UTC (the scheduled refresh worked), token expires 2026-10-15 12:00:02 UTC
- So the location was **reinstalled on Oct 12**. That created a new row and removed the row that held the error. The two Feb-2026 error rows (`5YCJUYbXbmkUvbnu9Qlu`, `VuoYGJ3hWr1FRjBuiL4e`) are also gone.
- The edge function logs have no entry with `invalid_grant` or `not active` that is still kept (old logs are deleted after a while). Chat history has no saved copy of the old row either.
- Unconfirmed from what remains: the Sep 16 timestamp, the old installation ID, and the exact wording `invalid_grant: Location is not active`. They came from that row's `refresh_error` field during the earlier investigation, and the row is gone. The endpoint was `POST https://services.leadconnectorhq.com/oauth/token` with `grant_type=refresh_token`. That is the only token endpoint the cron calls (confirmed in the source). Treat the earlier claim as reported but no longer verifiable.
- What this means: the "location not active" problem is fixed for now. Whether the current token is Company or Location class is still **unknown**. The 401 "authClass" error is the live question.

## 2. Caller inventory
- `ghl-api-proxy`: no calls from the app itself. It is called only from outside, by n8n workflows using the `x-ixty-proxy-secret` header (the code only mentions it in `docs/ARCHITECTURE.md`). The list of which n8n workflows call it has to come from n8n. That list is the next read-only step and can be pulled with the n8n workflow search, with your OK.
- `ghl-token-refresh`: called from `src/components/admin/HighLevelSettings.tsx:228` (the admin's manual refresh).
- `ghl-token-refresh-cron`: no schedule in the repository's migrations, so it is set up outside the code (in Supabase's scheduled jobs). The 12:00 UTC daily refresh above shows it is running.
- `ghl-api-proxy` (lazy refresh inside the proxy), `ghl-token-refresh` and the cron are the three separate pieces of code that write tokens. This is confirmed.
- `src/services/webhook/ghl-installation-resolver.ts` reads only non-sensitive fields, protected by RLS.

## 3. Token-class inspection: draft for review only, not deployed
New function `ghl-token-inspect` (verify_jwt = true, admin only). It decodes the stored access token's claims without calling HighLevel.

```ts
// supabase/functions/ghl-token-inspect/index.ts  (DRAFT — not deployed)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';
const Body = z.object({ installation_id: z.string().uuid() });
Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return j(401, { error: 'unauthorized' });
  const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: isAdmin } = await svc.rpc('has_role', { _user_id: u.user.id, _role: 'admin' });
  if (!isAdmin) return j(403, { error: 'forbidden' });
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return j(400, { error: 'invalid_input' });
  const { data: row } = await svc.from('ghl_installations')
    .select('id, location_id, company_id, access_token_encrypted').eq('id', p.data.installation_id).maybeSingle();
  if (!row?.access_token_encrypted) return j(404, { error: 'not_found' });
  const token = await decryptToken(row.access_token_encrypted, Deno.env.get('GHL_TOKEN_ENCRYPTION_KEY')!);
  const c = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  // Allowlisted, non-secret claims only. Token, signature, and refresh token are never returned or logged.
  return j(200, {
    installation_id: row.id,
    auth_class: c.authClass ?? null, auth_class_id: c.authClassId ?? null,
    matches_location: c.authClassId === row.location_id,
    matches_company: (c.companyId ?? c.authClassId) === row.company_id,
    scope_count: Array.isArray(c.oauthMeta?.scopes) ? c.oauthMeta.scopes.length : null,
    exp_utc: c.exp ? new Date(c.exp * 1000).toISOString() : null,
  });
});
// j() = JSON response helper; decryptToken = same AES-GCM routine as ghl-token-refresh.
```

Admin authorization tests (`ghl-token-inspect/index.test.ts`, offline with a mocked client):
1. No Authorization header returns 401.
2. A valid non-admin user returns 403, and nothing is read from `ghl_installations`.
3. An admin with an `installation_id` that is not a UUID returns 400.
4. An admin with an unknown ID returns 404.
5. An admin with a synthetic Location-class JWT returns 200 with `auth_class: "Location"` and `matches_location: true`.
6. An admin with a synthetic Company-class JWT returns `auth_class: "Company"` and `matches_location: false`.
7. The response body and captured logs never contain the token, any part of the signature, or `refresh_token`.
8. An anon key with no user session returns 401.

## Next decisions (each needs separate approval)
- Approve the n8n read-only workflow search to finish the list of who calls the proxy.
- Approve deploying `ghl-token-inspect` and running it once on `7a1087ef-...`.
