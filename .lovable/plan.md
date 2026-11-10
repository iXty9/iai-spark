# CMS v2: next development steps

## Where we are
- Contacts, tags and tasks work end to end through CMS v2. Writes ask you to confirm first, and the tag test you ran succeeded.
- Order: contacts (done), conversations, calendars, invoices.

## Step 1: Finish Slice A
- Add the "Skip confirmations" switch under Settings > Integrations, next to the HighLevel card. It is off by default and each user can change only their own.
- Bring the task list up to date.
- Check the first automatic refresh of the new connection (Nov 11, around 12:00 UTC).

## Step 2: Slice B, conversations
- **Reads:** search conversations, open one, and list its messages.
- **Writes (confirm first):** create, update and delete a conversation.
- **Send a message (high risk, always shows a summary):** SMS, email or other channels, but only to contacts in your own sub-account. The summary shows the recipient, the channel and the full text.
- Added to CMS v2 and to your chat workflow's tool, using the same confirmation flow as contacts.

## Step 3: Slice C, calendars
- **Reads:** calendars, free slots, blocked slots, events and appointments.
- **Writes (confirm first):** create and update appointments and blocked times.
- **High risk:** delete events, and create or delete calendars.

## Step 4: Slice E, invoices
- **Reads:** list invoices, open one, and invoice settings.
- **Writes:** create and update invoices.
- **High risk:** send, void, record payment and delete.

## Step 5: Tidy CMS v2
- Group the canvas into sections (input and checks, contacts, conversations, calendars, invoices, tests).
- Remove the 2 extra manual test starters.
- Update the built-in self-tests for each slice.

## Step 6: Switch over (after each slice works)
- Publish the app so ixty.ai uses the new path. Your Lovable plan is active again.
- Remove the matching old tools from your chat workflow.
- Move incoming HighLevel alerts off the old workflow.
- Lock and then retire the old proxy.

## How each slice is tested
Rule tests (sub-account binding, path safety, field limits and confirmation rules), then one live check by you in the preview.

## Technical notes
- Each area gets its own function (ghl-conversations, ghl-calendars, ghl-invoices). They share the signed note, the token manager and the confirmation rules from `_shared/`, and each has its own `*-core.ts` with Deno tests.
- I may move the confirmation gate code into `_shared/ghl-write-gate.ts` so every area reuses it.
- CMS v2 sends requests to the right function by operation prefix (contacts.*, conversations.*, and so on), using one Switch node and one HTTP node per area.
