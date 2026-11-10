# Hermes continuity — pre-pilot fixes (IT Helper findings 1 and 2)

IT Helper found two real gaps. Both are fixed here; the switch stays OFF, and no live Hermes messages are sent until you approve the pilot.

Confirmed now: switch is `false`; exactly 1 account is both allowlisted and set to Hermes (the switch is global, but only that account is affected when it's turned on).

## 1. No webhook fallback once Hermes is in charge
Problem: if the call to Hermes itself breaks (network drop, sign-in hiccup, garbled reply), the app quietly answers from the webhook instead.
Fix: when the switch is on, only "not set up for Hermes" (`hermes_not_selected`, `hermes_not_allowed`) may fall back. Every other failure shows an error, whether or not the server labelled it. The app treats Hermes as in charge when it has seen the switch on, or holds a conversation token, or the first status check itself fails. With the switch off, behaviour stays as today.

## 2. Reset fencing made watertight
Problem A (server): the "has a reset happened?" check and the "save the reply" step were separate. A reset landing between them let an old reply be saved and shown.
Fix A: one database operation locks the user's conversation row, checks generation and token, and only then saves the reply. If a reset won, the turn is marked stale, no reply text is stored, and the user gets `stale_generation`. Reset takes the same row lock, so the two can never interleave.

Problem B (browser): a New Chat in one tab cleared other tabs' screens but not their Hermes token, so a reply already on its way could still appear there.
Fix B: the existing clear broadcast also invalidates that tab's Hermes conversation marker. The reply check runs again at the final moment, just before the reply is shown and saved, not only when it arrives.

## Tests added
- Browser routing: switch on + send throws, or returns an unlabelled error -> zero webhook calls, error shown. Denial codes -> one webhook call. Switch off -> today's fallback.
- Bridge: reset placed after the final generation read but before saving -> reply not stored, `stale_generation`.
- Browser fence: another tab's clear while a reply is in flight -> reply not inserted.
- All 12 existing tests rerun.

## After the build I report
Commit of the saved source, test results, the deploy fingerprint, and a fresh read-back showing the switch is still OFF.

## Technical details
- Migration (additive): `public.hermes_finish_turn(p_user uuid, p_generation int, p_token uuid, p_msg uuid, p_status text, p_reply text, p_error text) returns boolean`, plpgsql, `security definer`, `set search_path = public`. It does `select ... for update` on `hermes_conversations`; on mismatch it sets the turn to `failed`/`stale_generation` with a null reply and returns false. `REVOKE EXECUTE` from public, anon and authenticated; grant to service_role. Reset stays a single conditional UPDATE, which takes the same row lock.
- `HermesStore.finishTurn` gains a `token` argument and returns boolean. `handleSend` drops the separate `getConversation` fence and uses that result.
- `hermes-provider.ts`: module-level `hermesMode: 'on' | 'off' | 'unknown'` and `invalidateHermesConversation()`. The catch path reports `continuity: hermesMode !== 'off'`.
- `message-processor.ts`: when Hermes is selected, fallback happens only if the code is one of the two denials, or the mode is `off`. The token/epoch check repeats after `handleStreamingResponse`, before `onMessageComplete`.
- `use-chat-sync.ts` `handleClearBroadcast` calls `invalidateHermesConversation()`.
- Browser routing tests use the project's existing test runner, with the Supabase invoke and webhook mocked.
- Out of scope: CMS v2, the 18 older scan warnings, Hermes/CT117 changes, other users' settings.
