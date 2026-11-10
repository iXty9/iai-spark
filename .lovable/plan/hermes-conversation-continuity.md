# Hermes conversation continuity — app-side review (planning only)

Status: review only. No code, migration, secret or deployment changes. Implementation waits for IT Helper's backend contract (section 7) and owner approval.
Scope: iai-spark browser + Supabase `hermes-chat`. CT117/Hermes is owned by IT Helper. CMS v2 is out of scope (the actor note is touched only where it shares the request).
Base commit reviewed: `a85e29e237c3bf4ba923ea25f123d0919817f554`.

## 1. Root cause (current path)

```text
Chat input -> message-processor.ts -> hermes-provider.ts -> hermes-chat -> Hermes POST /chat/completions
```

1. **The continuity header is never sent.** `hermes-chat/index.ts:128` sends `X-Hermes-Session-Key: client:iai-spark:user:<uid>`. Upstream Hermes continues a chat only when the request carries `X-Hermes-Session-Id`; without it every request gets a new session (the `api-*` sessions seen). Unless CT117 has custom handling for `X-Hermes-Session-Key`, Hermes ignores it.
2. **The returned session ID is never captured.** Hermes echoes `X-Hermes-Session-Id` in the response. `hermes-chat` reads only the body (`:155`, `:171`) and returns `{content, raw}`; nothing is stored.
3. **No history is sent either.** `message-processor.ts:62` builds `[{role:'user', content: message}]`, so each turn is stateless twice over: no session and no prior messages.
4. **Each turn's prompt differs.** `hermes-chat` adds a fresh system message (`IXTY_ACTOR:<note>`, `:133`) with a new signature and expiry every call, so any scheme that derives an ID from the first messages also splits.
5. **The app has no conversation ID.** Signed-in users have one active chat (`active_chat_messages`); n8n uses `sessionId = user_id`. "Clear chat" (`use-message-state.ts:183-217`) clears the table, broadcasts to other tabs and tells n8n, but never tells Hermes.
6. **Side paths.** The Retry button exists in `Message.tsx` but no caller connects it (`onRetry` is never passed). Any Hermes failure silently falls back to the webhook backend (`message-processor.ts:91-97`), so one visible chat can be split across two backends. Requests are non-streaming (`hermes-provider.ts:22`).
7. **Why it looked fine:** Honcho's long-term memory recalled facts across separate sessions, which hid the missing continuity. Tests must count sessions, not judge answers.

## 2. Proposed smallest correction

### 2.1 Conversation identity (server-owned)
- One active Hermes conversation per signed-in user, matching the app's single active chat.
- New service-only table `hermes_conversations` (RLS on, no policies, no grants to anon/authenticated):
  - `user_id uuid primary key references auth.users on delete cascade`
  - `conversation_id uuid not null` (new on every reset)
  - `hermes_session_id text null`
  - `created_at`, `updated_at`, `last_turn_at timestamptz`
- The browser never sends or receives a Hermes session ID. Per AGENTS.md, identity and targets are resolved server-side.

### 2.2 Session-ID persistence (`hermes-chat`)
Per turn, after the existing JWT, `preferred_backend` and allowlist checks:
1. Load or create the user's row.
2. If `hermes_session_id` is set, send `X-Hermes-Session-Id: <id>`. Otherwise use contract option A or B (section 7, Q1).
3. Read `X-Hermes-Session-Id` from the response and save it with a compare-and-set:
   `update ... set hermes_session_id = $new where user_id = $u and conversation_id = $c and (hermes_session_id is null or hermes_session_id = $sent)`.
   A New Chat or another tab that wins the race is not overwritten.
4. If the returned ID differs from the one sent (Hermes rotates sessions after context compression, upstream issue #16938), accept it only when Hermes reports it as a child of the sent ID (contract Q4). Otherwise keep the old ID and log it.
5. Remove `X-Hermes-Session-Key`, or keep it only if IT Helper confirms CT117 uses it (Q6).

### 2.3 History handling
- With a session ID: send only the new user message (+ actor note; see Q3). Hermes loads history from its own session store.
- First turn or after a reset: send only the new message. A new conversation starts empty.
- Lost session (Hermes says the ID is unknown or expired, Q2): clear `hermes_session_id`, start a new session in the same `conversation_id` and log `session_lost`. Smallest version: no replay from `active_chat_messages`. An optional later step could seed the last N turns.
- The browser's message list stays display-only for Hermes.

### 2.4 Ownership checks
- The session ID is read only from the user's own row, by `user_id` from the verified JWT. Body fields cannot choose it (Zod strips unknown keys, and a test proves it).
- Hermes uses one API key for all users, so Hermes must also refuse a session that belongs to another iai-spark user. Ask IT Helper to bind sessions to the server-set user key (Q5). The app's guarantee alone is defence in one layer.
- Admin backend toggle: switching to the webhook and back keeps the row, so the conversation continues. No reset happens unless the user clears the chat (open decision D1).

### 2.5 Refresh / tabs / New Chat / retry
- **Refresh, new tab, other device:** the row lives on the server, so the session continues.
- **New Chat / Clear chat:** `clearMessages()` also calls `hermes-chat` with `{action:"reset"}`, which sets a new `conversation_id` and `hermes_session_id = null`. This is best-effort and non-blocking, like the n8n clear-context call. Other tabs already get the clear broadcast, and the server row is shared.
- **Retry / duplicate submits:** pass the user message's existing client UUID as `client_message_id` (validated as a UUID) and forward it as Hermes `Idempotency-Key`. A resend or double-click then returns the same turn instead of adding a second one (Q7).
- **Concurrent first turns (two tabs):** the compare-and-set keeps the first ID, and the losing turn's session is orphaned and logged. Contract option A (app-minted ID) removes this case.
- **Fallback to webhook:** keep falling back only for setup refusals (`hermes_not_selected`, `hermes_not_allowed`, `misconfigured`). On `upstream_error` or timeout, show an error instead of quietly answering from another backend (open decision D2).

### 2.6 Feature switch
- New `app_settings` key `hermes_session_continuity_enabled`, service-read only, default `false`. Off means exactly today's behaviour (no header, nothing stored). This follows the rule to read config from `app_settings`, not env.

## 3. Files that would change (after approval)
- `supabase/functions/_shared/hermes-session-core.ts` (new, pure rules) + `hermes-session-core.test.ts`
- `supabase/functions/hermes-chat/index.ts` (thin: load row, header, capture, reset action, idempotency)
- `src/services/chat/providers/hermes-provider.ts` (pass `client_message_id`; add `resetHermesConversation()`)
- `src/services/chat/message-processor.ts` (pass the message ID; narrow the fallback if D2 is approved)
- `src/hooks/chat/use-message-state.ts` (call reset inside `clearMessages`)
- One additive migration: table + setting row. No changes to existing tables.
- Unchanged: chat-relay, webhook path, anonymous chat, CMS v2, actor-note format.

## 4. Targeted tests

Deno rule tests (`hermes-session-core.test.ts`):
1. No row -> no session header; row with ID -> header equals stored ID.
2. Body `session_id` / `hermes_session_id` is ignored.
3. Response ID saved only when conversation matches and the stored value is null or equal to the sent one.
4. A reset during an in-flight turn: the stale response does not overwrite the new conversation.
5. Rotation: a child ID is accepted only per the contract rule; an unrelated ID is refused.
6. Unknown-session response -> clear and start new, flagged `session_lost`.
7. `client_message_id` must be a UUID and maps to `Idempotency-Key`.
8. Switch off -> request identical to today's (no header, no write).

Live checks with IT Helper (Honcho recall ignored; judged by Hermes session list):
- 3 messages -> exactly 1 Hermes session holding 3 turns.
- Hard refresh, then a 4th message -> same session.
- Second tab -> same session; Clear chat -> next message opens a new session.
- Second test user -> separate session; a forged body ID changes nothing.
- Double submit with the same message ID -> one turn.
- Hermes restart -> session continues (or `session_lost` path, per contract).
- Admin, anonymous and webhook chats behave as today.

## 5. Rollback
1. Set `hermes_session_continuity_enabled = false`: takes effect immediately, no deploy.
2. If needed, redeploy the previous `hermes-chat` (base commit above) and revert the three browser files.
3. The table is additive. Leave it in place, or drop it after 30 days. No user data is lost; chat history stays in `active_chat_messages`.

## 6. Open decisions for the owner
- D1: Should switching backend (webhook <-> Hermes) start a new Hermes conversation, or continue it? Proposed: continue.
- D2: Stop silent fallback to the webhook on Hermes errors and show an error instead? Proposed: yes.

## 7. Backend contract needed from IT Helper (CT117 / Hermes 0.23.1)
- Q1: Can the client supply a brand-new `X-Hermes-Session-Id` on the first turn and have Hermes create it (option A, app mints `iai-<uuid>`)? Or must the app take the ID Hermes returns (option B)? Option A removes the first-turn and timeout race.
- Q2: Exact response (status/body) for an unknown, expired or deleted session ID.
- Q3: With a session ID, are body `system` messages honoured each turn and are they stored in history? The actor note rotates every turn, so it must reach the agent without piling up stale notes. Is a header-only or per-turn-ephemeral channel available?
- Q4: After context compression, does 0.23.1 return the new child ID in `X-Hermes-Session-Id`? How can the app confirm it is a child of the ID sent?
- Q5: Can Hermes bind a session to a server-set owner key and refuse cross-owner loads? Which header?
- Q6: Is `X-Hermes-Session-Key` used anywhere on CT117 (Honcho peer mapping?). If yes, what format?
- Q7: `Idempotency-Key` support on non-streaming `/chat/completions`: retention window and duplicate response.
- Q8: Endpoint path stays `${HERMES_API_BASE_URL}/chat/completions`; any rate or concurrency limit per session (two tabs).
