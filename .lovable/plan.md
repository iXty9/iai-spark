# Restore HighLevel message delivery

## What was found
- **The old n8n address isn't the cause.** No live setting or user profile points to `n8n.ixty.ai:5679`. HighLevel messages are already sent to `https://n8n.ixty.ai/webhook/9e16570c...`. The port only shows up in two old migration files, which are history and never run again.
- **Signature checks pass.** HighLevel's new Ed25519 signatures verify on every message.
- **The real cause is a broken connection.** Location `YZQCL96jxM5knY233VD4` has been marked as an error since **Sep 16, 2026**. That day the scheduled token refresh failed with HighLevel's reply `invalid_grant: Location is not active`. Since then, every message gets a "No connected installation found" reply with a 404 error, and nothing is passed on to n8n. The HighLevel Marketplace shows these 404s as errors. Its retries are then skipped as duplicates.
- Two other locations (`5YCJUYbXbmkUvbnu9Qlu`, `VuoYGJ3hWr1FRjBuiL4e`) have been in the same error state since Feb 2026.

## Steps
1. **Your action (required): reconnect the HighLevel app for this location.** Reinstall the app or reconnect it in HighLevel, or click Reconnect in Settings > Integrations. The old login token is permanently invalid, so code alone cannot fix this. A fresh install marks the location as connected again.
2. **Keep forwarding messages when the connection has an error.** If a location is known but its connection has an error or has expired, still send the message to n8n. The message will include the user's ID and a `connection_status` field, so n8n can decide what to do. Only return "not found" for locations that are truly unknown.
3. **Reply to HighLevel with "OK" for unknown locations.** Use a 200 reply with `{ forwarded: false, reason }` instead of 404. HighLevel then stops flagging the app as failing and stops retrying. The warning still goes to the logs.
4. **Make the token refresh failure visible.** When a refresh fails with `invalid_grant`, mark the connection as `expired` and write a clear note saying it needs a reinstall. That way the Admin GHL panel shows that action is needed.

## Technical details
- File: `supabase/functions/ghl-notification-proxy/index.ts`. The lookup will match the location regardless of status. Add `connection_status` to the enriched payload. Change the 404 reply to a 200 reply.
- File: `supabase/functions/ghl-token-refresh-cron/index.ts`. Map `invalid_grant` to status `expired`.
- Redeploy both functions. After you reconnect, check the logs for "Forwarded to n8n".
- No database schema changes.
