## Plan

1. **Fix the toast system mismatch**
   - The Hermes fallback code currently calls Sonner directly, but the app only mounts the legacy shadcn `<Toaster />` in `App.tsx`.
   - Change the Hermes fallback notifier to use the mounted app toast system so the message is actually visible.

2. **Limit the toast to the intended Hermes denial case**
   - Show exactly one toast only when `hermes-chat` returns `hermes_not_allowed`.
   - Keep fallback-to-webhook behavior for other Hermes failures, but do not show the “not enabled for this account yet” toast for unrelated errors.

3. **Preserve existing chat fallback**
   - Leave the existing webhook fallback path intact so the message still completes normally after Hermes returns 403.

4. **Keep diagnostics useful**
   - Keep the existing backend routing/fallback logs so future tests can confirm `preferred_backend: hermes`, `route: hermes`, and fallback execution.

## Expected result after implementation

When the test user has `preferred_backend = 'hermes'` and is not in `hermes_allowed_users`, the browser will still show the 403 request to `hermes-chat`, then display one visible toast:

`Hermes is not enabled for this account yet. Using the standard webhook backend.`

The chat reply should still arrive through the standard webhook fallback.