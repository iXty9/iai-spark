# Preflight + build: seal chat posting, retire old workflow leftovers, fence old proxy, sweep old setup code

## Preflight findings (checked today)
- "iai-spark: Message" workflow is now visible. It has an MCP door plus two steps that post to the chat-posting step using a stored n8n login ("iai-spark JWT"). The AI behind it fills the whole request itself, including which user gets the message and the "send to everyone" flag.
- Only two things in the app call the chat-posting step: the new notification delivery step and the admin "test" buttons.
- The notification address setting already points at the new workflow (`ghl-notifications-v2`) and the trial copy is blank. No old notification address is left in settings, so item 2 needs no settings change. I'll just clear the blank trial setting and confirm the old workflow shows no runs.
- The old proxy password is saved in the settings table. The build checks who can read it.
- The old setup wizard (Initialize page and database setup step) still includes the browser-side "create admin user" code.

## Build pass
1. **Seal chat posting**
   - Chat posting accepts only (a) a valid signed actor note, which forces the recipient to that note's user, or (b) a new server-only password header. Everything else is refused (401).
   - "Send to everyone" and lookup by username work only with the server password.
   - The notification delivery step sends its signed note. The Message workflow's two steps send the server password through a new n8n login.
   - Admin test buttons go through an admin-checked server path.
   - Order: new password, then callers updated, then the lock. Undo = redeploy the previous version.
   - Tests: no note, forged note, wrong user, valid note, valid password.
2. **Old workflow leftovers**
   - Remove the unused trial setting.
   - Record that the old workflow is inactive, with 30-day archive later, in the task list.
3. **Fence the old proxy**
   - `ghl-api-proxy` refuses every write (POST/PUT/PATCH/DELETE). Reads are limited to a short allowlist.
   - Rotate its password and make it server-only: removed from browser-readable settings and stored as a backend secret.
   - Check first that no active n8n workflow still calls it. Undo = redeploy the previous version.
4. **Sweep old setup code**
   - Remove `init-service.ts` admin-creation code, `DatabaseSetupStep`, and the Initialize wizard route, plus any import that only they use.
   - Keep `coordinatedInitService` and the app start-up order exactly as they are.
   - Check Reconnect, SupabaseAuth and the debug panel, and keep anything they still use.

Not in this pass: Hermes continuity (item 5).

## Technical details
- New secret `PROACTIVE_POST_SECRET` (header `x-ixty-post-secret`). Signature check uses the existing `_shared/ixty-actor.ts`. Rules go in `_shared/proactive-auth-core.ts` with Deno tests.
- Proxy fence rules go in `_shared/ghl-api-proxy-fence-core.ts` with tests. The rotated secret goes from `app_settings.ghl_proxy_secret` to a function secret.
- Redeploy: proactive-message-webhook, ghl-notification-deliver, ghl-api-proxy. Update and publish n8n `As0N7YJMxat5v2KZ`.
- Update AGENTS.md with the chat-posting rule and roadmap.md.
