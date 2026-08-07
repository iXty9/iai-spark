# Fix: chat fails after n8n endpoint change

## What's actually wrong

Nothing in the app is hardcoded to the old `:5679` endpoint for chat. The live settings already point at `https://n8n.ixty.ai`, and the app reads the chat webhook URL straight from Admin Panel → AI → Webhooks (via the app settings table).

The failure is a **CORS allowlist gap on the n8n side** for the *authenticated* chat workflow. Verified preflight results against `https://n8n.ixty.ai`:

```text
Origin                                   Anonymous workflow      Authenticated workflow
https://ixty.ai                          allowed                 allowed
https://iai-spark.lovable.app            allowed                 REJECTED (returns ixty.ai)
https://id-preview--...lovable.app       allowed                 REJECTED (returns ixty.ai)
```

The anonymous workflow (`...9553f3d36574`) echoes back whichever Lovable origin asks, so anonymous chat works. The authenticated workflow (`...9553f3d014f7`) always answers `access-control-allow-origin: https://ixty.ai`, so the browser blocks the request from the preview and published Lovable domains — surfacing as "I'm sorry, but I encountered an error processing your message."

The Webhook Status Monitor still shows all 7 hooks online because it probes them through the `webhook-proxy-test` edge function (server-side, no CORS involved).

## Fix

1. **n8n (you, no code change):** in the authenticated chat workflow's webhook node, add the same allowed-origins list the anonymous workflow uses — `https://ixty.ai`, `https://iai-spark.lovable.app`, and the preview domain `https://id-preview--80fcca4c-5286-4dbb-a5b8-32ea128e55a8.lovable.app`. Keep `content-type` and `x-webhook-token` in the allowed headers (authenticated chat sends the auth token header).

2. **App-side cleanup (I do this):** two saved webhook settings were missed in the endpoint migration and still point to the old port:
   - `clear_context_webhook_url` → `https://n8n.ixty.ai:5679/webhook/48bc23a4-...`
   - `ghl_notification_webhook_url` → `https://n8n.ixty.ai:5679/webhook/9e16570c-...`

   I'll update both to the portless `https://n8n.ixty.ai` host so Clear Context and GHL notifications don't break.

3. **Stale defaults (I do this):** the first-run/init SQL in `src/services/supabase/init-scripts.ts` still seeds `:5679` URLs for new installs. I'll update those default strings to the new host. Historical migration files stay untouched.

4. **Verify:** after your n8n change, send a message as an authenticated user on the preview URL, plus one as anonymous, and confirm both get a reply. If authenticated still fails, the preflight response for that workflow will tell us immediately whether the allowlist took effect.

## Technical notes

- Chat dispatch path: `use-chat-api.ts` → `message-processor.ts` → `services/webhook/webhook-service.ts`, with the URL resolved by `services/webhook/url-provider.ts` from the cached app settings (5-minute TTL, context-aware). No hardcoded host anywhere in that path.
- Per-user custom webhook overrides (`profiles.webhook_url`) can also shadow the global URL; if the error persists for one specific account I'll check that user's override for a leftover `:5679` value.
