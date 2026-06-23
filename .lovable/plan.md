## Goal
Add a dev/admin-only "Backend" toggle in the existing actions (More) dropdown so I can switch my own account between `webhook` and `hermes` without touching ordinary users.

## Scope
Frontend-only change. No DB migrations, no edge function changes, no secrets, no app_settings changes. Hermes server-side allowlist remains the source of truth for access.

## Where it goes
`src/components/chat/header/HeaderActions.tsx` — inside the existing `MoreVertical` dropdown, as a new `DropdownMenuSub` labeled **Backend**, placed right after the existing **Text Size** submenu and before **Dev Mode**.

Submenu items:
- "Webhook (default)" → sets `profiles.preferred_backend = 'webhook'`
- "Hermes Agent"      → sets `profiles.preferred_backend = 'hermes'`

Active option shown with the same `Check` icon pattern already used by the Text Size submenu.

## Visibility / access control
Reuse the existing admin check already used by `UserMenu.tsx` (`checkIsAdmin` from `services/admin/...`). Inside `HeaderActions`:

- Add `const [isAdmin, setIsAdmin] = useState(false)`.
- In a `useEffect` keyed on `user?.id`, call `checkIsAdmin(user.id)` and set state. Reset to `false` when logged out.
- Render the Backend submenu only when `user && isAdmin`.

Result: anonymous users and non-admin authenticated users see no change.

## Behavior
- On select, run `supabase.from('profiles').update({ preferred_backend: value }).eq('id', user.id)`.
- Local state `preferredBackend` is hydrated once on mount from the same row, so the checkmark reflects current value.
- Toast confirms the change ("Backend set to Hermes Agent" / "Backend set to Webhook").
- Dispatch a `window.dispatchEvent(new CustomEvent('preferred-backend-changed'))` so `useChatApi` can drop its cached value.
- In `src/hooks/chat/use-chat-api.ts`, add a small listener inside the existing effect: on `preferred-backend-changed`, clear `loadedForUserRef.current` and call `loadPreferredBackend(user.id)` again. This is the only edit outside the header file and keeps the next message routed correctly without a page reload.

## What stays unchanged
- Default `preferred_backend` remains `'webhook'`; nothing in this change writes for new users.
- `hermes_allowed_users` is untouched. Selecting Hermes when not allowlisted continues to surface the existing 403 toast from `hermes-chat`.
- No changes to webhook payload, recall, location, attachments, or message processor.
- No secrets referenced in frontend.

## Files touched
1. `src/components/chat/header/HeaderActions.tsx` — add admin check, Backend submenu, update handler.
2. `src/hooks/chat/use-chat-api.ts` — listen for `preferred-backend-changed` to invalidate the cached ref.

## Verification (post-build)
- Manual: load app as admin → open More menu → confirm Backend submenu visible with current selection checked; switch to Hermes, send a message, observe Hermes route; switch back to Webhook, send a message, observe webhook route.
- Manual: load app as non-admin (or anonymous) → confirm Backend submenu is absent.
- `rg -n "HERMES_API_SERVER_KEY" src/` → expect zero matches.
- No production publish performed.
