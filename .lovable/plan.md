## Plan: Developer Documentation for New AI Admin Section

### Goal
Produce a clear developer write-up that explains the new **AI** section in the Admin Panel and the multi-harness foundation that was just added.

### Deliverable
Create a markdown documentation file at `docs/AI-HARNESS-ADMIN.md` containing:

1. **What changed (high level)**
   - The previous standalone **Webhooks** tab is now grouped under a new top-level **AI** tab.
   - A second sub-tab, **Hermes**, is added as a placeholder for the second harness.
   - Each harness has a master enable/disable toggle stored in `app_settings`.
   - Real-time Messaging under App Settings is intentionally untouched.

2. **Files involved**
   - `src/components/admin/ai/AISettings.tsx` — new nested tab container for AI harness settings.
   - `src/components/admin/ai/HarnessEnableToggle.tsx` — new reusable enable/disable toggle for any harness.
   - `src/components/admin/AdminTabs.tsx` — replaced `webhookContent` prop with `aiContent`, added `ai` tab.
   - `src/pages/Admin.tsx` — imports `AISettings`, redirects legacy `?tab=webhooks` to `?tab=ai`, accepts `?tab=ai`.
   - Existing `src/components/admin/webhooks/WebhookSettings.tsx` and its internals — relocated into the AI tab, otherwise unchanged.

3. **New app_settings keys**
   - `ai_harness_webhooks_enabled` — defaults to `true`.
   - `ai_harness_hermes_enabled` — defaults to `false`.
   - Both are lazily upserted when an admin toggles the switch.

4. **UI/UX details**
   - Desktop: horizontal scrollable tab strip now shows **AI** instead of **Webhooks**.
   - Mobile: dropdown selector lists **AI**.
   - Inside the AI tab, two sub-tabs appear: **Webhooks** and **Hermes**.
   - The Webhooks sub-tab renders the full existing WebhookSettings UI plus the new enable toggle.
   - The Hermes sub-tab currently shows only the enable toggle and a "Coming soon" placeholder card.
   - Legacy `/admin?tab=webhooks` URLs automatically map to the AI tab.

5. **Behavior of the enable toggle**
   - Scope is a master toggle: when disabled, the harness is unavailable to users.
   - Toggle persists via `updateAppSetting` and invalidates the settings cache via `settingsCacheService.invalidateCache()`.
   - Toast notifications confirm success/failure.

6. **Out of scope / future wiring**
   - The toggles are stored and rendered but are not yet consumed by chat routing or harness selection logic.
   - Hermes configuration UI is a placeholder only.
   - Real-time Messaging tab is unchanged and remains harness-agnostic.

### Verification
- Review the generated markdown for accuracy against the actual file contents.
- Ensure no file modifications are made to production code.