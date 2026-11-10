# Today: switch notifications to CMS v2 and submit the HighLevel draft app

Goal for this session: HighLevel notifications run through the new workflow (CMS v2), the old workflow is no longer needed for daily use, and the draft app is ready for you to submit to the HighLevel marketplace.

## Step 1 - Check that the published site is healthy (5 min)
- Open ixty.ai and iai-spark.lovable.app, signed in and signed out, and confirm chat loads and answers.
- If anything is stale, publish again.

## Step 2 - Build the notification entry in CMS v2 (main work)
- Add a "HighLevel notification" entry to CMS v2 that only accepts events carrying a valid signed actor note from our notification forwarder. Unsigned or expired events are refused.
- Copy the useful behavior of the old notification branch (which event types it handles and what it does with each), mapped onto the new tools.
- Add self-checks for: valid event, missing note, forged note, unknown event type.

## Step 3 - Side-by-side trial (30-60 min of real traffic)
- Turn on the trial setting so each notification goes to both the old and new workflows. The old one stays in charge; the new copy cannot affect results.
- You trigger a few real events in HighLevel (new contact, inbound message, appointment). I compare both runs.

## Step 4 - Switch over
- Point notifications at CMS v2 only, turn the trial off.
- Keep the old workflow switched on but unused for 7 days as a safety net. Undo is one setting change.

## Step 5 - Prepare the marketplace submission
- Confirm the draft app's install and reconnect flow works end to end (already proven on your location).
- Checklist for you: permissions list matches what the app uses (including oauth.write), redirect address points to the live site, notification address points to our forwarder, description and support details filled in.
- You submit. Customers on the current live version keep working until they reinstall the approved version.

## Held for a later session
- Giving Hermes the same signed access to CMS v2.
- Locking down the old shared-password door and retiring the old workflow (after the 7-day safety window).
- Fresh security scan before wider sharing.

## Decisions needed from you today
- Which HighLevel events matter most to test in the trial (so we can trigger them quickly).
- OK to switch over the same day if the trial matches, rather than waiting a day.

## Technical details
- CMS v2 workflow `WJwAJ0X5Qy64MJ1q`: new webhook entry verifies `x-ixty-actor` with the shared actor verifier, then routes by event type; rules stay in pure code with routing self-tests.
- `ghl-notification-proxy` already signs and forwards; trial uses `ghl_notification_shadow_url` in app settings; cutover swaps the forward URL in app settings, no redeploy expected.
- Before Step 2, re-read the old workflow `luqGQ154hrSvAf4n` notification branch to inventory event handling (not re-verified today).
