## Action: Mark findings as accepted, document the risk

You've accepted the exposure as a known architectural limitation pending a future webhook proxy. No code or RLS changes will be made now.

### Steps
1. **Ignore both scanner findings** with explanatory rationale:
   - `supabase_lov / app_settings_anon_webhook_auth_header_value`
   - `supabase_lov / app_settings_webhook_auth_header_value`
   
   Rationale recorded on each: webhook calls currently go browser→n8n directly, so `webhook_auth_header_value` must be client-readable. Token is treated as a public shared identifier, not a true secret. Proper fix requires moving calls behind an edge function proxy first.

2. **Update `@security-memory`** to add a new accepted-risk entry describing:
   - Current architecture (direct-from-browser webhook calls).
   - That `webhook_auth_header_name` / `webhook_auth_header_value` in `app_settings` are intentionally readable by `anon` and `authenticated` and must not be treated as secrets.
   - That `profiles.custom_webhook_auth_header_value` follows the same pattern (per-user, owner-readable only) for the same reason.
   - Required follow-up before the RLS can be tightened: build a `webhook-proxy` edge function, migrate all 6 webhook clients, then remove the keys from the SELECT policies and rotate the token in n8n.
   - Guidance to future scanners/agents: do not re-flag these two `app_settings` keys until the proxy ships; do not "fix" them by dropping them from the policies in isolation (that breaks chat).

3. **No other changes.** Code, RLS, and n8n config are untouched.

### What's not in scope this pass
- Building the proxy edge function.
- Token rotation.
- Touching `profiles` realtime / `pg_graphql` / public bucket warnings.

Approve and I'll execute steps 1 and 2.