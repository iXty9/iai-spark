# Hermes conversation continuity — revised design and implementation checkpoint

IT Helper's contract (Hermes 0.23.1, commit 3b42157) corrects several assumptions in the first review. This plan applies only those changes. On approval: (1) the review file `.lovable/plan/hermes-conversation-continuity.md` is updated to rev 2, then (2) the code is built and deployed with the new switch OFF, so nothing changes for anyone. Turning it on for the pilot user and running IT Helper's test canaries are separate steps.

## Product decisions (taken as recommended — reject the plan to change them)
- One active chat per user, shared across tabs and devices. No archived or multi-chat UI in this milestone.
- Switching Webhook <-> Hermes keeps the Hermes conversation. The two backends' histories stay separate and are never merged.
- When Hermes is selected and fails, the user sees an error. The app does not quietly answer from the Webhook instead.
- Clear chat / New Chat is the deliberate reset. It must be confirmed by the server before the screen clears.

## What changes from rev 1
1. **The session ID is created before the first message.** On first use the server atomically creates the user's conversation row with an unguessable `iai-<uuid>` session ID, then sends that same ID on every turn. No first-turn race, no orphan sessions. The returned ID is checked: a different ID is an error, never adopted.
2. **No compression swap logic.** Hermes keeps the same ID through compression, so the child-ID check is removed.
3. **Generation fence.** Each conversation has a generation number and an opaque token. The browser holds the token, never the Hermes ID. Every send carries it, and the server refuses a stale token. The chat screen also drops any reply whose generation no longer matches.
4. **Reset is acknowledged.** New Chat calls the server, which bumps the generation and creates a new session ID in one step. Only after success does the screen clear and the new token go to other tabs (existing clear broadcast). On failure the screen stays as it was and shows "Couldn't start a new chat — try again".
5. **No silent lost-session replacement.** Hermes 409 `not_found` (retired session) shows "This conversation is no longer available — start a new chat". 429 shows "Hermes is busy, try again in a moment". 503 `admission_queued` shows "Received, still working" and is not resent. A timeout is treated as "may have been received", not as failure.
6. **Retries that respect the signed note.** Each user message's existing ID becomes a turn record (user, generation, message ID) with status and stored reply. A repeat of the same message ID replays the stored reply after the usual sign-in and ownership checks, with no new Hermes call. If the turn is still pending or uncertain, the user is told and nothing is resent. Hermes' Idempotency-Key is derived server-side from user + generation + message ID, used once per turn, and never paired with a newly signed note. Different message IDs are different turns.
7. **Keep `X-Hermes-Session-Key`.** It stays as `client:iai-spark:user:<verified uid>` for memory and the harness. The actor note stays a fresh system message each turn; Hermes keeps it out of chat history.
8. **Honest security boundary.** Supabase alone enforces that a user can reach only their own conversation (JWT + Hermes selected + allowlist + own row, on every request). Hermes cannot tell app users apart under the shared key. This counts as safe for the allowlisted pilot, not as multi-tenant isolation; that would need a separate design.
9. **Switch behaviour.** New `app_settings` key `hermes_session_continuity_enabled`, default off. If reading it fails, the request errors; it never quietly picks a mode. Turning it off is emergency containment: it brings back today's broken stateless mode, with a one-time notice in chat. The conversation table is kept; nothing is deleted on a timer.
10. **Webhook fallback is narrowed.** Only `hermes_not_selected` and `hermes_not_allowed` (the user isn't really on Hermes) still use the Webhook, with today's notice. All other Hermes errors are shown.

## Technical details
- Migration (additive, service-only, RLS on, no policies or grants):
  - `hermes_conversations(user_id pk -> auth.users cascade, generation int, conversation_token uuid, hermes_session_id text, created_at, updated_at)`. Created with `insert ... on conflict do nothing` + select. Reset = a single `update ... set generation = generation+1, new token, new session id where user_id and conversation_token = $sent returning *`.
  - `hermes_turns(user_id, generation, client_message_id uuid, status pending|completed|failed|uncertain, reply text, created_at, updated_at; pk(user_id, generation, client_message_id))`.
  - Insert the setting row with value `false`.
- `_shared/hermes-session-core.ts` (pure rules): build upstream headers/body, classify Hermes responses (200 / 400 / 409 not_found / 409 admission_conflict / 429 / 503 admission_queued / timeout), generation checks, turn-state transitions, idempotency-key derivation. Tests sit beside it.
- `hermes-chat/index.ts`: dependencies injected (store, fetch, clock), so bridge-level tests run against a fake store and fake Hermes. Body adds `conversation_token`, `client_message_id`, `action: "send" | "reset" | "state"`. It never logs or returns the actor note.
- Browser: `hermes-provider.ts` (token cache, reset, state), `message-processor.ts` (passes the message ID, narrowed fallback, generation check before showing a reply), `use-message-state.ts` (clear waits for the reset acknowledgement).
- Unchanged: chat-relay, the Webhook path, anonymous chat, CMS v2, the actor-note format, and the Hermes endpoint `${HERMES_API_BASE_URL}/chat/completions`.

## Tests
- Rule tests: header/body shape; a returned ID that differs from the one sent counts as an error; generation mismatch; each Hermes response class maps to the right user state; turn transitions; idempotency key is stable per turn and differs across turns or generations; switch off and lookup failure.
- Bridge tests (fake store + fake Hermes): two concurrent first turns share one session ID; reset during an in-flight send (stale reply refused and not stored); failed reset leaves the conversation unchanged; same-message retry replays the stored reply without calling Hermes; pending or uncertain retry is not resent; a forged body session ID or another user's token is refused; a partial or error envelope from Hermes; Webhook-mode regression (Hermes code never runs).
- Live canaries (need separate approval; run with IT Helper, judged by Hermes' session list, not by answers): new ID creates a session; 3 messages make 1 session; refresh and a second tab keep it; New Chat makes a new one; the actor note doesn't build up in history; the same turn replays while a changed note isn't resent; a second user is separate.

## Rollback
- Containment: switch off (immediate, today's stateless behaviour, notice shown).
- Full: redeploy the previous `hermes-chat` and revert the three browser files. Tables stay unless you separately approve deleting them. The actual deployed version is recorded after deploy.
