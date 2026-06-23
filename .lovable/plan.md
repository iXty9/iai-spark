## Goal

Restructure the Admin Panel to pave the way for multi-harness support:

- Add a new top-level **AI** tab.
- Move the existing **Webhooks** tab under AI as a sub-tab.
- Add a new **Hermes** sub-tab (placeholder for now).
- Each harness sub-tab gets a master enable/disable switch.
- Leave Real-time Messaging (under App Settings) unchanged.

## UI Changes

### `src/components/admin/AdminTabs.tsx`
- Remove `webhooks` entry from `tabItems`; add `{ value: "ai", label: "AI", icon: Sparkles, shortLabel: "AI" }` in its place (same slot to keep tab order familiar).
- Replace the `webhookContent` prop with `aiContent`.
- Remove the `TabsContent value="webhooks"` block; add `TabsContent value="ai"` that renders `aiContent`.
- Keep URL param support; add `'ai'` to the allowed tab-param list in `Admin.tsx`.

### New `src/components/admin/ai/AISettings.tsx`
- Container component rendering a nested shadcn `Tabs` with two sub-tabs: **Webhooks** and **Hermes**.
- Mobile: same dropdown pattern used by `AdminTabs` (small, local — no need to extract).
- Sub-tab content:
  - **Webhooks** → renders `<HarnessEnableToggle harness="webhooks" />` above the existing `<WebhookSettings />`.
  - **Hermes** → renders `<HarnessEnableToggle harness="hermes" />` plus a "Coming soon" placeholder card.
- Sub-tab state can be local React state, with optional `?ai_tab=` query param mirroring the outer pattern (nice-to-have, not required for v1).

### New `src/components/admin/ai/HarnessEnableToggle.tsx`
- Small card with a shadcn `Switch`, label ("Enable [Harness name]"), and a one-line description ("When disabled, this harness is unavailable to all users.").
- Reads/writes a boolean key in `app_settings` via existing `settingsService` helpers and the `use-app-setting-boolean` hook pattern already in the codebase.
- Keys: `ai_harness_webhooks_enabled` (default `true` for backward compatibility) and `ai_harness_hermes_enabled` (default `false`).
- This stores the flag only — no chat-routing wiring in this pass (separate change when multi-harness selection lands).

### `src/pages/Admin.tsx`
- Replace `WebhookSettings` import + `webhookContent` prop with `AISettings` + `aiContent`.
- Extend the allowed tab-param check to include `'ai'` (drop `'webhooks'`, or keep it and silently map to `'ai'` so old bookmarks still land in the right place — preferred).

## Data / Backend

- No schema or RLS changes. Two new `app_settings` rows will be lazily upserted by the toggle component the first time an admin flips them, matching how other boolean flags are handled today.

## Out of Scope (explicitly not changing)

- Real-time Messaging tab under App Settings — left exactly as-is.
- Chat routing / harness selection logic — flags are stored but not yet consumed.
- WebhookSettings internals — relocated only, not refactored.
- Hermes implementation details (endpoints, models, auth) — placeholder only.

## Files touched

- edit: `src/components/admin/AdminTabs.tsx`
- edit: `src/pages/Admin.tsx`
- add: `src/components/admin/ai/AISettings.tsx`
- add: `src/components/admin/ai/HarnessEnableToggle.tsx`

## Verification

1. Admin Panel shows new **AI** tab where Webhooks used to be; Webhooks is gone from the top strip.
2. Clicking AI reveals two sub-tabs: **Webhooks** and **Hermes**.
3. Webhooks sub-tab renders the existing full Webhooks UI with a new enable switch on top; toggling persists across reload.
4. Hermes sub-tab shows enable switch + placeholder; toggling persists across reload.
5. Old `/admin?tab=webhooks` URLs still land on the AI → Webhooks view.
6. Real-time Messaging tab under App Settings is unchanged.
7. Mobile dropdown lists AI (not Webhooks) and the sub-tabs still work.
