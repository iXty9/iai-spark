# CMS v2 contacts — app-side sign-in handoff (review only)

On approval, the only file written is `.lovable/plan/cms-v2-app-session-handoff-review.md`, with the full proposed code included in it. No app code, functions, database, secrets or n8n are changed.

## Baseline
- Current commit `20a9a0354d950253c5acfc6545dad83f2c156a9f`. The reviewed baseline is `e2b619e`. Since then only `public/site-config.json` and `public/version.json` changed (auto-generated version info). That drift doesn't matter here.

## Source findings (from reading the code, not from live runtime)
1. `webhook-service.ts:293` makes the browser `fetch` directly to n8n. It sends only `Content-Type` plus a shared header from `auth-header-builder.ts` (global) or `user-webhook-resolver.ts` (per-user `custom_webhook_auth_header_*`). No `Authorization` or Supabase session is sent. **Confirmed.**
2. The payload's `user_id`, `isAuthenticated`, `location` and `ghl` (from `ghl-installation-resolver.ts`, a browser-side query) all come from the browser. They are not proof of identity. **Confirmed.**
3. The custom webhook override happens in the browser (`resolveUserWebhookUrl`). The URL is user/admin-configured, so forwarding a JWT to it would leak it. **Confirmed.**
4. `ghl-api-proxy` (`verify_jwt=false`) checks only `x-ixty-proxy-secret` and trusts `user_id` from the body (line 315). Any secret holder can act as any user. This is the bypass that must be fenced.
5. The proven pattern for checking a signed-in user already exists: `hermes-chat` calls `auth.getUser()` with the caller's Bearer token (lines 29-42). We reuse it.
6. HighLevel dependencies:
   - Scopes requested: `HighLevelConnectionCard.tsx:24` (no `oauth.write`).
   - No Company→Location exchange anywhere.
   - Credential writers: `ghl-oauth-callback`, `ghl-api-proxy` (lazy refresh), `ghl-token-refresh`, `ghl-token-refresh-cron`.
   - Source cannot prove live granted scopes or token class. That stays a live-evidence gate.

## Recommended design: signed-in relay plus a short-lived signed actor pass
```text
browser --Bearer session--> [chat-relay edge fn] --signed actor pass--> n8n chat (vy6O...)
                                                              | (n8n-set context, not model)
CMS v2 (WJwA...) --pass + service secret--> [ghl-contacts edge fn] --> HighLevel
```
1. **Session source:** the browser sends `supabase.auth.getSession()`'s access token to a new `chat-relay` function. This applies only for signed-in users. Anonymous chat stays on its current direct path.
2. **Server check:** `chat-relay` calls `auth.getUser(token)`. If the session is missing, expired, invalid or from another project, it returns 401 before anything else runs. The browser's `user_id` is ignored.
3. **Destination:** `chat-relay` resolves the webhook server-side. It uses the custom webhook if enabled, otherwise the global one. The destination must match an exact allowlist (`https://n8n.ixty.ai/webhook/*`), and redirects are refused (`redirect: 'manual'`). The JWT is never forwarded.
4. **Actor pass:** `chat-relay` looks up the installation server-side by verified `user_id` and requires `connection_status='connected'`. It then signs a pass with HMAC-SHA256 using secret `CMS_ACTOR_SIGNING_KEY`. The pass contains `{sub, installation_id, location_id, aud:"cms-v2", iat, exp:+5min, jti}` and goes in header `X-Ixty-Actor`. The rest of the payload stays the same, so chat responses still work.
5. **Contacts boundary:** a new `ghl-contacts` function accepts only two operations, `contacts.search` and `contacts.get`. It requires:
   - the service header `CMS_CONTACTS_SERVICE_SECRET`;
   - a valid pass (signature, audience, expiry);
   - a fresh server-side check that the installation still belongs to `sub`.

   The model's arguments are typed business fields only (query, limit, contactId). Any `user_id` or `location_id` in them is rejected. `locationId` is always taken from the pass.
6. **Bypass fence:** after cutover, `ghl-api-proxy` rejects `/contacts*` for pilot installations, controlled by flag `ghl_proxy_contacts_fenced` in `app_settings`. Other domains and the legacy workflow are unaffected until the later phases.
7. **Preserved:** anonymous chat, Hermes, recall, attachments, signup/feedback webhooks, and other users. Phase 1 turns on the relay only for profiles with a new admin flag (pilot Josh).

## n8n specification (for IT Helper)
- Chat caller: copy the `X-Ixty-Actor` header into execution context. Never put it in the prompt or tool arguments. Pass it to the MCP tool as a fixed header.
- CMS v2: the MCP entrypoint forwards `X-Ixty-Actor` plus the service secret to `ghl-contacts`, and keeps the existing typed validation and normalization.
- Redact the header from execution logs and saved data.

## Deployment and rollback
- Order:
  1. Add secrets.
  2. Deploy `ghl-contacts`.
  3. Deploy `chat-relay`.
  4. IT Helper wires n8n.
  5. Enable the pilot flag.
  6. Turn the fence on.
- Edge functions deploy automatically. The frontend change only reaches ixty.ai on publish, and publishing needs an active plan.
- Rollback: turn off the pilot flag, which sends the browser back to the direct path. Then turn the fence off.

## Proposed tests (not run)
- A valid session searches and gets contacts.
- Missing, expired, malformed or wrong-project tokens get 401 before any n8n or HighLevel call.
- Tampering is rejected:
  - a body `user_id` or `location_id` that differs from the pass;
  - a modified pass;
  - a pass with the wrong audience or an expired pass.
- A pass from another user can't read this user's location.
- `ghl-contacts` rejects requests without the service secret, without a pass, or for an operation not on the allowlist.
- The fenced `ghl-api-proxy /contacts` path is rejected.
- A non-allowlisted custom URL is refused, a 30x redirect is not followed, and the JWT never appears in the outgoing request.
- Chat response parsing is unchanged, and anonymous chat is unchanged.

## Live-evidence gates (need separate approval)
- The current token class and whether contacts scope is actually granted for `7a1087ef...`. This needs the deployed `ghl-token-inspect` run or one supervised contacts call.
- A Company-class token would still return 401 on contacts. If so, the reviewed token-lifecycle work (Location exchange) must come first.

## Not performed
No code, edge function, database, secret, n8n, token, HighLevel or publish changes.
