# Switch HighLevel notifications to the new workflow, then lock down chat posting

## 1. Compare the test runs
- Look at your test contact, inbound message and appointment events in both workflows (old live runs and new trial copies).
- Check that the new workflow got each event, picked the right user, and wrote the same summary the old one sent.
- If anything is different or missing, stop, fix it, and ask you for one more quick test. No switch-over until they match.

## 2. Switch over
- Point the notification forwarder at the new workflow and turn off the trial copy.
- Turn off only the notification part of the old workflow, so it can't send duplicates. Leave the rest of it alone for now.
- Ask you for one real test event and confirm one message shows up in your chat, from the new workflow only.
- To undo: change one setting back to the old address.

## 3. Lock down chat posting (must be done before the marketplace app is published)
- Right now, the step that posts assistant messages into a user's chat accepts any request. After this change it will only accept:
  - requests carrying a valid signed note, posted only to the user named in that note, or
  - requests from our own services using a server-only password.
- Find every place that uses this step today (old workflow, new workflow, chat replies) and move each one to the signed version before turning off the unsigned door, so nothing stops working.
- Tests: a request with no note gets refused, a forged note gets refused, a note for user A can't post to user B, and a valid note gets delivered.

## 4. Marketplace submission
- Go through the draft app checklist with you: permissions, redirect address, notification address, listing details.
- You submit. Customers on the live version keep working on the old tokens until they reinstall.

## Technical details
- Step 1 uses n8n execution history for both workflows and `ghl-notification-deliver` records of shadow copies (`x-ixty-shadow: 1`).
- Step 2 changes the `app_settings` notification target, clears `ghl_notification_shadow_url`, and disables the old workflow's notification trigger branch.
- Step 3 hardens the proactive-message edge function to require either `x-ixty-actor` (verified via `_shared/ixty-actor.ts`, recipient forced to `sub`) or a service secret; it will be added to AGENTS.md as a rule. Deno rule tests go next to the shared core.
- Still on hold afterward: Hermes on the CMS v2 MCP door, fencing `ghl-api-proxy`, retiring the old workflow.
