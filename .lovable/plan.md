# Retire the old "📢 HighLevel API" workflow

Status: the old workflow hasn't run since notifications switched over (no runs after 16:40 UTC today). Chat no longer uses it. It still has four ways in: the old notification address, the old chat tool door, the Hermes door and the IT Helper door.

## 1. Lock down chat posting first (before marketplace publish)
- Needs from you: turn on MCP access for "🌟 iai-spark: Message" so I can see how it posts into chats.
- I'll move that workflow and the new notification step to signed requests, then shut the open door. Tests: no note gets refused, a forged note gets refused, a note for user A can't post to user B.

## 2. Give Hermes the new door
- Add a CMS v2 door Hermes can use, covering the same contacts, conversations, calendars and invoices tools, with the same signed identity and write confirmations.
- Point Hermes at it and run a quick test: "find Joshua".
- Retire the IT Helper door. Nothing replaces it.

## 3. Quiet period (7 days)
- Watch the old workflow's runs every day. Anything that still shows up gets traced and moved before we continue.
- Watch the old shared-password back door (`ghl-api-proxy`) too. Only the paths the old workflow uses should still be calling it.

## 4. Unpublish
- Save a copy of the old workflow (kept 30 days), then unpublish it. To undo, I republish it with one step.
- Remove the old notification address from settings so nothing can be pointed back at it by mistake.

## 5. Close the back door
- Block `ghl-api-proxy` from everything except what's still needed, and turn it off once nothing calls it.
- Change its shared password. You may need to update it in any n8n credential I can't see.
- After 30 days with no issues, archive the old workflow.

## Decisions for you
- OK to retire IT Helper access completely?
- Do you want a 7-day quiet period, or should it be shorter? It can be shorter since the old workflow already shows zero traffic.

## Technical details
- Old triggers: webhook `9e16570c-…` (GHL Notifactions), MCP triggers CMS MCP, Hermes Access and IT Helper Access.
- Step 1 hardens `proactive-message-webhook` so it accepts either `x-ixty-actor` (recipient forced to `sub`) or a service-only secret/service-role bearer. Admin tester calls require an admin JWT. Rule core and Deno tests live in `_shared/`, and an AGENTS.md rule is added.
- Step 2 adds an MCP Server Trigger to CMS v2. Hermes sessions get an actor note from a `hermes-chat` mint, never from body fields.
- Step 5: the `ghl-api-proxy` allowlist turns into a hard 410, then the function is deleted, and the `ghl_proxy_secret` rotation goes in app_settings.
