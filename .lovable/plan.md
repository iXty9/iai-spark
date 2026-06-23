# Test: Hermes selected but NOT allowlisted → expect graceful webhook fallback

## Test subject
- User: `joshua@ixty9.com` (`jleemc44`), id `5519f7f8-2619-43a1-99d7-bb1d1cc1d0d2`
- Current state: `preferred_backend = 'webhook'`, **not** in `hermes_allowed_users` ✅

## Setup (one data write, no schema or code changes)

```sql
UPDATE public.profiles
SET preferred_backend = 'hermes'
WHERE id = '5519f7f8-2619-43a1-99d7-bb1d1cc1d0d2';
```

No delete needed — `hermes_allowed_users` already has no row for this user.

## How to run the test

1. After I apply the update, hard-refresh the preview tab (the `preferred_backend` value is cached per-session via `useRef` in `use-chat-api.ts`, so a reload is required for the change to take effect).
2. Send any chat message while signed in as `joshua@ixty9.com`.

## Expected behavior

- Browser calls `hermes-chat` edge function.
- Edge function returns **403 `hermes_not_allowed`** (service-role check against `hermes_allowed_users`).
- `sendHermesMessage` resolves with `{ ok: false, errorCode: 'hermes_not_allowed' }` — never throws.
- `message-processor.ts` falls through to `sendWebhookMessage` (the same path that works today).
- Exactly **one** toast appears: *"Hermes is not enabled for this account yet. Using the standard webhook backend."* (module-level `warned` flag in `hermes-provider.ts` ensures one-per-session).
- Assistant reply comes back via the normal n8n webhook.

## Verification checklist
- [ ] Reply renders in chat
- [ ] Exactly one fallback toast (send a second message; no second toast)
- [ ] `hermes-chat` edge function logs show a 403 with code `hermes_not_allowed`
- [ ] n8n authenticated workflow shows the request (proves fallback fired)

## Revert after testing

```sql
UPDATE public.profiles
SET preferred_backend = 'webhook'
WHERE id = '5519f7f8-2619-43a1-99d7-bb1d1cc1d0d2';
```

I'll provide this revert as a follow-up once you confirm the test result.

## Confirm before I proceed
- Use `joshua@ixty9.com` as the test user? If you'd rather use a different account, give me the email or UUID and I'll re-target the update.