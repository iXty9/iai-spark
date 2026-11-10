# Next phase: move notifications, open integrations to every AI backend, retire the old workflow, publish

## 1. Move HighLevel notifications to CMS v2
Today: HighLevel event -> our notification service (checks it is genuine, removes duplicates) -> old workflow's notification step -> an AI step decides what to tell you -> in-app message or pop-up alert.

Build:
- A notification entry in CMS v2 that only accepts events from our notification service (signed, short-lived note naming the installation and user, like the chat note).
- Our notification service looks up which user owns the location before forwarding, so CMS v2 never guesses.
- Same result for you: an in-app message or alert, sent only to the owner of that location.
- Side-by-side: for a few days both workflows get each event; the new one runs in "log only" mode. You compare, then I switch it to live and stop sending to the old one. No gap expected; worst case a few duplicate alerts during the switch.

## 2. One door to integrations for every AI backend
Your rule: every backend (Webhook today, Hermes, future ones) gets the same connected integrations, HighLevel first.
- CMS v2 becomes the single integration hub. Any backend reaches it the same way: with a signed note from our app saying which signed-in user is asking.
- The app issues that note when it routes a message, whichever backend you picked, so Hermes gets HighLevel access with the same ownership checks and write confirmations as the Webhook backend.
- Hermes connects through a CMS v2 MCP door that requires that note, replacing the old "Hermes Access" door.
- "IT Helper Access" (the outside developer's door) is retired; if you want it back later it gets its own read-only, admin-approved key.
- Future integrations plug into the same hub, so new backends get them automatically.

## 3. Lock down and turn off the old workflow
- Once notifications and Hermes have moved: fence the old shared-password HighLevel route so nothing new can use it, watch it for 7 days, then switch it off and change that password.
- Deactivate the old workflow, keep a backup copy 30 days, then archive. Remove the disabled old tool node from chat.

## 4. Publish to ixty.ai
- Fix the page-loading setting that breaks pages on refresh, and make the site tell visitors to refresh when a new version is out (clears the stale cached copy).
- Publish. Check ixty.ai loads, sign-in works, chat and a contact search work.
- Can happen right after step 1 or even now; it does not depend on the HighLevel review.

## 5. HighLevel marketplace update (when you submit)
- No hard deadline on our side: your location runs on the draft install, and other customers keep the current version.
- Customers on the current live version still get old-style (non-exchanged) tokens, so the new tools may fail for them until they reinstall after approval. Others whose connection already shows broken need a reinstall anyway.
- Only date to watch: HighLevel retires the old signature header Sep 1, 2026 — already handled, we use the new one.

## Order and effort
1 -> 4 (publish) -> 2 -> 3. Roughly: step 1 one session, step 2 one to two sessions, step 3 is mostly waiting the 7 days.

## Technical details
- Step 1: `ghl-notification-proxy` resolves `user_id` from `ghl_installations` by locationId, adds HMAC note (`_shared/ixty-actor.ts`, purpose `notification`), posts to a new CMS v2 webhook; `ghl_notification_webhook_url` switched in `app_settings` at cutover; shadow mode = dual post with a flag.
- Step 2: `hermes-chat` mints the same actor note as `chat-relay`; CMS v2 MCP trigger verifies it via the ghl-* functions (they already trust only the note). Record "integrations are backend-agnostic via actor note" in AGENTS.md.
- Step 3: allowlist + caller logging in `ghl-api-proxy`, then disable; rotate `x-ixty-proxy-secret`.
- Step 4: `vite.config.ts` base `./` -> `/`; service-worker update prompt; then publish.
