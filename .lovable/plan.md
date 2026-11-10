# Road to completion: retire the old HighLevel workflow and go live

Chat tools for contacts, conversations, calendars and invoices now work through CMS v2. What remains, in order:

## 1. Unplug the old tools from chat (small, reversible)
- In the chat workflow, disconnect the old Contacts, Conversations, Calendar, Task and Invoice sub-agents so the AI can only pick the CMS v2 tools.
- Keep them on the canvas (disabled) for one week as a quick rollback.
- You run a short smoke test: find a contact, read a conversation, list calendars, show an invoice.

## 2. Move incoming HighLevel notifications
- The old workflow still receives HighLevel events (new messages, appointments, etc.) and turns them into in-app messages and pop-up alerts.
- Rebuild that path in CMS v2: receive the event from our notification service, check it is genuine, look up the right user, send the in-app message.
- Run old and new side by side briefly, compare, then switch the notification address to CMS v2. Possible short pause in alerts during the switch.

## 3. Lock down the old back door
- The old workflow uses a shared password plus a user ID the AI fills in. Once nothing uses it: restrict it to the CMS v2 areas only, then switch it off.
- Rotate that shared password afterward.
- Also cover the other entry points the old workflow had (Hermes and IT Helper access) — decide whether they move to CMS v2 or are retired.

## 4. Turn off the old workflow
- Deactivate, keep a backup copy for 30 days, then archive.

## 5. Publish to your real site (ixty.ai)
- Fix the site loading setting that can break pages on refresh, and help visitors clear the stale cached version.
- Requires an active Lovable paid plan to publish to the custom domain.
- Publish the draft HighLevel app version (with the new permission) in the HighLevel marketplace so other customers get it; existing locations must reinstall.

## 6. Nice-to-have afterwards
- Clearer error messages naming the exact wrong field.
- Opportunities tools (new capability, not in the old workflow).
- Other locations still showing a broken connection need reinstalling.

## Decisions needed from you
- OK to unplug the old sub-agents now (step 1)?
- Keep or retire Hermes / IT Helper access to HighLevel?
- When can you reactivate the Lovable plan, and when to submit the HighLevel app update?

## Technical details
- Step 2: new `ghl-notification-proxy` target = CMS v2 webhook, reusing Ed25519 verification and the signed actor note; dedup by existing composite key.
- Step 3: fence `ghl-api-proxy` to an allowlist, log callers for 7 days, then disable; rotate `x-ixty-proxy-secret`.
- Step 5: `vite.config.ts` base `./` -> `/`; service worker update prompt.
