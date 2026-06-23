## Findings so far
- The test user is correctly configured: `preferred_backend = 'hermes'` and not allowlisted.
- Recent preview network data shows no request containing `hermes`.
- Hermes edge-function logs show only boot/shutdown events and no `hermes_not_allowed` call.
- That means the app is still routing directly to the standard webhook path before Hermes is invoked, so the toast cannot appear.

## Plan
1. **Trace the frontend routing decision**
   - Inspect the chat send path that reads `profiles.preferred_backend` and decides whether to call `hermes-chat`.
   - Verify whether the value is cached too early, not refreshed after login/profile updates, or unavailable due to timing.

2. **Make Hermes selection reliable for authenticated sends**
   - Before sending an authenticated message, ensure the app has a current `preferred_backend` value for the active user.
   - If the cached value is missing or stale, reload it from `profiles` before choosing the backend.
   - Keep anonymous users on the existing webhook path unchanged.

3. **Preserve the safety fallback behavior**
   - When `hermes-chat` returns `hermes_not_allowed`, show exactly one toast:
     `Hermes is not enabled for this account yet. Using the standard webhook backend.`
   - Then continue through the existing webhook backend so the message still succeeds.

4. **Add minimal debug visibility without user-facing clutter**
   - Log the backend routing decision through the existing logger/debug event pattern, not raw production console logs.
   - This will make it clear whether a message selected `webhook` or attempted `hermes` during future tests.

5. **Validate**
   - Confirm a new authenticated message triggers a `hermes-chat` call.
   - Confirm the edge function returns `hermes_not_allowed` for the non-allowlisted test user.
   - Confirm exactly one toast appears and the fallback webhook response still arrives.