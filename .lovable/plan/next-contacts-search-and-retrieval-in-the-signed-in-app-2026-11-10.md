# Next: contacts search and retrieval in the signed-in app

## Confirmed now (read-only check, 13:12 UTC)
- New connection 8813a31c for sub-account YZQCL96jxM5knY233VD4 (IXTY9 LLC), connected 13:10 UTC, no errors.
- `oauth.write` is in the saved permissions. The blocker is cleared.
- Stored as a sub-account pass made from the agency pass (`derived_location`). Expires Nov 11, 2026.
- The old connection 7a1087ef was replaced.

## Step 1 — Keep the connection alive (most urgent, before the next 12:00 UTC refresh)
- Make the daily refresh, the manual "Refresh" button and the proxy's own refresh handle a sub-account pass made from an agency pass. Today they only know the original kind.
- Put all three behind one shared token manager so only one refresh can run at a time.
- If refreshing the sub-account pass is rejected, fall back to a fresh exchange from the agency pass, and never loop.
- Add the small table changes this needs (who holds the lease, generation counter).

## Step 2 — Signed-in chat and contacts lookup
- `chat-relay`: checks the sign-in, picks the n8n address on the server, and adds a short signed "who is asking" note.
- `ghl-contacts`: search and get contact only, for the signed-in user's own sub-account.
- Block `/contacts*` on the old shared-secret route for the pilot user only.

## Step 3 — App and n8n
- App sends chat through `chat-relay` when signed in. Signed-out chat stays as it is.
- In CMS v2 (WJwAJ0X5Qy64MJ1q): check the signed note, add `contacts_search` and `contacts_get` tools. The legacy workflow stays active.

## Step 4 — Tests, pilot, cutover
- Rule tests: one refresh at a time, wrong user denied, unsigned n8n call denied, contacts only for own sub-account.
- Pilot signed in as jleemc44: search a contact, open it.
- Cutover with the short notification pause you already accepted.

## Decisions needed from you
- None for Steps 1–2. Before cutover: the `IXTY_ACTOR_SIGNING_SECRET` value must be entered in n8n as a credential (I'll guide you).
- Publishing to ixty.ai still needs an active Lovable plan. The draft HighLevel app must be submitted and approved before other sub-accounts can install it.

## Technical notes
- Refresh of a derived Location token through `/oauth/token` is unverified; Step 1 tries it once on the real connection, and if it fails falls back to `/oauth/locationToken` using the stored Company credential.
- Reuse the reviewed lifecycle manager from `.lovable/plan/ghl-token-lifecycle-manager-code-only-review.md`.
