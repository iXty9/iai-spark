## Next test: Hermes selected AND allowlisted (happy path)

Now that the safety fallback is verified, validate the end-to-end Hermes path.

### Setup (SQL editor)

```sql
-- Already set, but confirm:
UPDATE public.profiles
SET preferred_backend = 'hermes'
WHERE id = '5519f7f8-2619-43a1-99d7-bb1d1cc1d0d2';

-- Add to allowlist:
INSERT INTO public.hermes_allowed_users (user_id, enabled)
VALUES ('5519f7f8-2619-43a1-99d7-bb1d1cc1d0d2', true)
ON CONFLICT (user_id) DO UPDATE SET enabled = true;
```

### Test in preview

Send a chat message as the test user.

### Expected

- No "Hermes not enabled" toast.
- Network: `POST /functions/v1/hermes-chat` returns **200** (not 403).
- Reply renders in chat, sourced from Hermes (not n8n).
- Edge function logs show a successful upstream call to `HERMES_API_BASE_URL/chat/completions`.

### If it fails

Likely culprits and what I'll check:
- `upstream_error` → Hermes secret/base URL/model misconfigured.
- `empty_response` → upstream returned a shape we're not parsing (`choices[0].message.content`).
- Still falls back → recall context or message shape causing the provider to bail.

No code changes proposed yet — this plan is just the test procedure. Approve to switch to build mode if any fix is needed after you run it.