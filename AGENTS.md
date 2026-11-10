# AGENTS.md

- Signed-in chat goes browser → `chat-relay` edge function → n8n; the relay resolves the n8n address, auth header, user identity and HighLevel info server-side. Why: the browser must not choose identity or target.
- `chat-relay` only calls https, default-port `/webhook/` addresses on hosts of the admin-configured global chat URLs. Why: profile webhook URLs are user-editable.
- Identity to n8n tools is a short-lived HMAC actor note (`x-ixty-actor`, `_shared/ixty-actor.ts`, secret `IXTY_ACTOR_SIGNING_SECRET`); tools trust only its claims, never body `user_id`. Why: the AI agent fills tool bodies.
- HighLevel contacts reads for n8n go through `ghl-contacts` (search/get only, typed schema 1.0, own sub-account only). Why: `ghl-api-proxy` trusts a shared secret plus caller `user_id`.
- Pure rules live in `supabase/functions/_shared/*-core.ts` with Deno tests beside them; edge entrypoints stay thin. Why: rules are testable without network.
- All HighLevel token refreshes go through `_shared/ghl-token-manager.ts`. Why: one refresh at a time per installation.
- New ghl-* tools use `_shared/ghl-tool-runtime.ts` (actor → installation → token → ownership prepare → gate → run). HighLevel writes from n8n pass `_shared/ghl-write-gate.ts`: they run only if the user's profile skips confirmations or the same change was confirmed in a later chat message (newer actor note). Why: the AI fills tool bodies and must not self-confirm.
- CMS v2 routes each operation prefix to its own ghl-* function (contacts, conversations, …); no general HighLevel pass-through. Why: per-area allowlists.
