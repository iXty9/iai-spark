## Implementation (smallest safe diff)

### 1. Edge Function `supabase/functions/hermes-chat/index.ts` (new)
- CORS via existing `_shared/cors.ts`.
- Verify caller JWT: anon client + `Authorization` header → `auth.getUser()`.
- Service-role client (`SUPABASE_SERVICE_ROLE_KEY`, server-only, `persistSession: false`) for defense-in-depth:
  1. `profiles.preferred_backend === 'hermes'` → else `409 { code: 'hermes_not_selected' }`.
  2. `hermes_allowed_users.enabled === true` for `user.id` → else `403 { code: 'hermes_not_allowed' }`.
- Zod body: `messages: [{role: 'system'|'user'|'assistant', content: string}].min(1)`, optional `stream: boolean`.
- POST `${HERMES_API_BASE_URL}/chat/completions` (resolves to `https://sandbox-hermes.ixty.ai/v1/chat/completions`) with:
  - `Authorization: Bearer ${HERMES_API_SERVER_KEY}`
  - `Content-Type: application/json`
  - `X-Hermes-Session-Key: client:iai-spark:user:<user.id>`
  - Body: `{ model: HERMES_MODEL, messages, stream }`.
- SSE passthrough only if upstream content-type is `text/event-stream` AND client asked `stream:true`. Otherwise return JSON `{ content }` extracted from `choices[0].message.content`.
- Upstream errors → `502 { code: 'upstream_error' }`. Never log/echo `HERMES_API_SERVER_KEY`.

### 2. `supabase/config.toml`
- Add `[functions.hermes-chat] verify_jwt = false` (validated in code).

### 3. Frontend providers (new files only)
- `src/services/chat/providers/index.ts` — `resolveProvider(profile)`: returns `'hermes'` only when `profile?.preferred_backend === 'hermes'`, else `'webhook'`.
- `src/services/chat/providers/hermes-provider.ts`:
  - `sendHermesMessage({ messages, signal? })` calls `supabase.functions.invoke('hermes-chat', { body: { messages, stream: false } })`. Returns `{ ok, content?, errorCode?, errorMessage? }`; never throws.
  - `notifyHermesFallbackOnce()` — module-level `warned` flag, fires `toast.info('Hermes is not enabled for this account yet. Using the standard webhook backend.')` at most once per page session.

### 4. Single profile source of truth (no extra fetch per message)
- `src/hooks/chat/use-chat-api.ts` is already a real React hook (`useCallback`, `useRef`). Add a `useRef<string | null>(null)` cache + a `useEffect` that runs once per `user?.id` change to fetch `profiles.preferred_backend` via supabase client and store it in the ref. Include `preferred_backend: preferredBackendRef.current` in the `userProfile` object passed to `processMessage`. No fetch per message; no invalid hook usage (file is a hook).
- `src/services/types/messageTypes.ts` — extend `userProfile` type with optional `preferred_backend?: string | null`.

### 5. `src/services/chat/message-processor.ts` — preserve lifecycle exactly
- Insert Hermes branch BEFORE the webhook call, AFTER `onMessageStart?.(assistantMessage)` and the existing cancel check. The same `assistantMessage` object is reused (no duplicate). Same `pending → final` transition, same `onMessageStream` via existing `handleStreamingResponse`, same `onMessageComplete`, same cancel semantics (the existing `controller` is forwarded as `signal` to `supabase.functions.invoke`):
  ```ts
  const useHermes = isAuthenticated && userProfile?.preferred_backend === 'hermes';
  if (useHermes) {
    const hermesMessages = [{ role: 'user' as const, content: message }];
    const result = await sendHermesMessage({ messages: hermesMessages, signal: controller.signal });
    if (result.ok && result.content != null) {
      const accumulated = await handleStreamingResponse(
        result.content, onMessageStream, canceled, controller,
      );
      Object.assign(assistantMessage, {
        content: accumulated.trim() || result.content,
        pending: false,
        rawRequest: { provider: 'hermes', messages: hermesMessages },
        rawResponse: { provider: 'hermes', content: result.content },
      });
      debug({ lastAction: 'API: Hermes message completed successfully' });
      onMessageComplete?.(assistantMessage);
      return {
        ...assistantMessage,
        cancel: () => { canceled = true; controller.abort(); },
      };
    }
    notifyHermesFallbackOnce();
    // fall through to existing webhook path unchanged
  }
  ```
- Webhook path is byte-identical to today.

### 6. Untouched
`src/services/webhook/*`, `use-chat.ts`, URL resolvers, streaming util, theme, auth, admin UI, all other profile columns, production publish (no `preview_ui--publish` call).

### 7. Post-implementation report (will deliver after build)
- Migration tables/columns confirmed via `supabase--read_query` (`profiles.preferred_backend`, `hermes_allowed_users`).
- Edge Function secret names configured (names only): `HERMES_API_BASE_URL`, `HERMES_API_SERVER_KEY`, `HERMES_MODEL` (+ existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- `rg HERMES_API_SERVER_KEY src/` → expect zero matches.
- Test summary:
  - (a) Default webhook user — chat unchanged (webhook path).
  - (b) `preferred_backend='hermes'` but not allowlisted — Edge Function returns `403 hermes_not_allowed`, one toast, message delivered via webhook fallback.
  - (c) `preferred_backend='hermes'` + allowlisted — Hermes called with `X-Hermes-Session-Key: client:iai-spark:user:<id>`, response rendered via existing simulated streaming.
