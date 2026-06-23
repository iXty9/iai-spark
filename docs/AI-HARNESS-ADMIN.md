# AI Admin Section & Multi-Harness Foundation

Status: preliminary — first pass of the multi-harness scaffolding.
Audience: developers working on the Admin Panel, chat routing, and future harness integrations.

## Overview

The Admin Panel previously exposed a top-level **Webhooks** tab. To pave the way for multiple AI "harnesses" (currently: the existing n8n-style **Webhooks** harness, and a new **Hermes** harness placeholder), Webhooks has been relocated under a new top-level **AI** section, and a master enable/disable toggle has been introduced per harness.

The Real-time Messaging tab under **App Settings** is intentionally unchanged. The proactive/toast messaging pipeline is designed to remain harness-agnostic so that messages still reach the user regardless of which harness they have selected.

## UI Structure

```text
Admin Panel
└── AI (new top-level tab, icon: Sparkles)
    ├── Webhooks (sub-tab)
    │   ├── Enable Webhooks   ← HarnessEnableToggle
    │   └── WebhookSettings   ← existing UI, unchanged
    └── Hermes (sub-tab)
        ├── Enable Hermes     ← HarnessEnableToggle
        └── "Coming soon" placeholder card
```

- Desktop: horizontal scrolling tab strip in `AdminTabs.tsx` shows **AI** in place of the old **Webhooks** entry.
- Mobile: the dropdown selector lists **AI**.
- Legacy URL `/admin?tab=webhooks` is mapped to `/admin?tab=ai` at mount time so existing bookmarks/links keep working.

## Files

| File | Status | Purpose |
| --- | --- | --- |
| `src/components/admin/ai/AISettings.tsx` | new | Nested `Tabs` container for harness sub-tabs. |
| `src/components/admin/ai/HarnessEnableToggle.tsx` | new | Reusable master enable/disable switch for any harness. |
| `src/components/admin/AdminTabs.tsx` | edited | Replaced `webhookContent` prop with `aiContent`; added `ai` tab item (Sparkles icon) in `tabItems`. |
| `src/pages/Admin.tsx` | edited | Imports `AISettings`, passes `aiContent={<AISettings />}`, handles `?tab=ai` and the legacy `?tab=webhooks` redirect. |
| `src/components/admin/webhooks/*` | unchanged | Existing `WebhookSettings` UI is now rendered inside the AI > Webhooks sub-tab. No internal refactor. |

## Data Model

Two new `app_settings` rows back the per-harness master toggles. Keys follow the pattern `ai_harness_${harnessKey}_enabled`.

| Key | Default | Notes |
| --- | --- | --- |
| `ai_harness_webhooks_enabled` | `true`  | Preserves current behavior — the Webhooks harness is on by default. |
| `ai_harness_hermes_enabled`   | `false` | Hermes is opt-in until its implementation lands. |

Rows are lazily upserted the first time an admin flips the switch — no migration ships with this change.

Values are stored as the string `'true'` / `'false'` to match the existing `app_settings` convention and are read through `useAppSettingBoolean(key, defaultValue)`.

## `HarnessEnableToggle` Contract

```tsx
<HarnessEnableToggle
  harnessKey="webhooks"     // becomes ai_harness_webhooks_enabled
  harnessName="Webhooks"    // display label + toast copy
  defaultEnabled={true}     // value used until the setting exists
/>
```

Behavior:
- Reads the boolean via `useAppSettingBoolean`.
- On change, calls `updateAppSetting(key, 'true' | 'false')` then `settingsCacheService.invalidateCache()` so the next read on any client picks up the new value.
- Surfaces success/failure via `useToast`.
- Disables the switch while loading or saving.

To add a new harness, drop another `<HarnessEnableToggle harnessKey="..." harnessName="..." />` next to its configuration UI inside `AISettings.tsx`; no other code needs to know about the new key.

## What This Change Does NOT Do

The toggles are stored and rendered but are **not yet read by chat routing or harness selection**. That wiring is a follow-up:

1. Resolve "is harness X available?" from `ai_harness_${key}_enabled` in the relevant service / context.
2. Hide disabled harnesses from any user-facing selector once such a selector exists.
3. Decide on conflict semantics if multiple harnesses can be active at once vs. a single active default.

Also out of scope in this pass:
- Hermes configuration fields (endpoint, model, auth) — placeholder only.
- Any refactor of `WebhookSettings` internals.
- Real-time Messaging UI/logic under App Settings.

## Verification Checklist

- `/admin` shows an **AI** tab on desktop and in the mobile dropdown.
- `/admin?tab=ai` opens the AI section directly.
- `/admin?tab=webhooks` redirects into the AI section (legacy link support).
- Webhooks sub-tab renders the unchanged `WebhookSettings` UI plus the enable toggle on top.
- Hermes sub-tab renders the enable toggle plus the "Coming soon" placeholder.
- Toggling either switch persists across reload and triggers a settings cache invalidation.

## Conventions Followed

- Files placed under `src/components/admin/ai/` to match the per-domain folder pattern used elsewhere in `admin/`.
- Components are PascalCase; the existing `services/admin/settingsService` and `settings-cache-service` are reused rather than forked.
- No changes to `App.tsx`, provider order, or `coordinatedInitService`.
- Theme tokens (`bg-background/80`, `text-muted-foreground`, etc.) used throughout — no hard-coded colors.
