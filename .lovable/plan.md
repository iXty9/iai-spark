# CMS v2: from contacts proof-of-concept to replacing the old workflow

## Where we are
Contacts search and get work end to end in the signed-in preview through the new path (app, chat-relay, your chat workflow, CMS v2 Contacts tool, ghl-contacts). Everything else your AI does in HighLevel still runs through the old "HighLevel API" workflow (luqGQ154hrSvAf4n). That workflow has about 46 HighLevel actions and trusts a shared password plus a user ID the AI can fill in.

## Step 1: Confirm the success (read-only)
- Read the n8n run and the ghl-contacts and chat-relay logs for your "Joshua" test.
- Confirm the run used the new tool rather than the old one, the signed note was accepted, and only allowed contact fields came back.
- Check tomorrow's first automatic refresh of the new connection (Nov 11, around 12:00 UTC).

## Step 2: Make a capability map (read-only, a short document for you)
List every action in the old workflow and group it by area (contacts, conversations and messages, calendars and appointments, opportunities, tasks and notes, tags, custom fields, and anything else it has). For each action, record:
- read or write
- how often your AI actually uses it, based on recent n8n runs
- risk (for example, sending a message or deleting a contact is high risk)

You choose the order. My suggestion is reads first, then low-risk writes, then high-risk writes.

## Step 3: Build in small, repeatable slices
Each slice follows the same recipe we used for contacts:
1. Add the action to ghl-contacts' sibling functions using a fixed address, a fixed method, and only the allowed fields. The rules go in testable shared code.
2. Add the matching typed operation to CMS v2.
3. Add or extend the tool in your chat workflow, passing the signed note along unchanged.
4. Run tests, then you run one live check in the preview.

Proposed first slices:
- **Slice A: finish contacts.** Create and update contacts, plus tags and notes, with confirmation wording for writes.
- **Slice B: conversations.** Read conversations and messages first. Sending is a separate, high-risk slice.
- **Slice C: calendars and appointments.**
- **Slice D: opportunities and pipelines.**

## Step 4: Switch over
- Publish the app so ixty.ai uses the new path. This needs an active Lovable plan.
- Remove the old tools from your chat workflow one area at a time, as each area is covered.
- Finally, lock the old proxy so it can only be used by your account and only for areas we haven't moved yet. Then retire it.

## Decisions I need from you
1. Should writes be allowed in v2? If yes, should the AI ask you to confirm before sending messages or deleting things?
2. Does my suggested order work (contacts, conversations, calendars, opportunities), or do you rely on something else most?
3. Do you want to reactivate the Lovable plan soon, so ixty.ai users get the new path before the old one is retired?

## Technical notes
- New functions reuse `_shared/ixty-actor.ts` (the signed note) and `_shared/ghl-token-manager.ts`, with `*-core.ts` rules and Deno tests next to them.
- Each area gets its own function or a strict per-area allowlist. There is no general pass-through proxy.
- Open items: the signed note currently lasts 10 minutes (the earlier plan said 2), and the HTTP node in CMS v2 has no API key header. Both will be reviewed in Slice A.
