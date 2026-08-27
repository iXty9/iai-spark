# HighLevel webhook signature migration (X-GHL-Signature / Ed25519)

## Short answer: yes, this would break us — but the fix is small and contained

Our GHL webhook verification lives in one shared file, `supabase/functions/_shared/ghl-signature-verify.ts`, and it reads **only** the `x-wh-signature` header with the legacy 4096-bit RSA key. If that header stops being sent on September 1, 2026, the function returns `Missing x-wh-signature header` and both webhook endpoints reject with 401:

- `ghl-install-webhook` — app install / uninstall events (installs would stop being recorded, uninstalls would stop cleaning up)
- `ghl-notification-proxy` — inbound GHL notification events forwarded to n8n

GHL retries non-2xx up to 12 times and then drops, so this would be a real outage of the integration, not a silent degradation.

Nothing else in the app touches GHL signatures: the OAuth callback, token refresh, and `ghl-api-proxy` are all outbound calls and are unaffected.

## Fix

Update the one shared verifier to be dual-header, preferring the new scheme (exactly what HighLevel recommends for the transition window):

1. Add HighLevel's Ed25519 public key alongside the existing RSA key. From the official guide:
   `MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=`
2. Verification order:
   - if `x-ghl-signature` is present → verify with Ed25519 over the raw body, base64 signature
   - else if `x-wh-signature` is present → verify with the existing RSA-SHA256 path (unchanged)
   - else → reject as today
3. Keep everything else exactly as it is: replay/timestamp protection, clock-skew allowance, the admin bypass flag, the `SignatureVerifyResult` shape, and the diagnostic logging (extended to say which scheme was used).
4. No changes needed in `ghl-install-webhook` or `ghl-notification-proxy` — they call `verifyGHLSignature(req, rawBody, bypassEnabled)` and keep working as-is.

## Verify

- Unit test the verifier in `supabase/functions/_shared/` with a locally generated Ed25519 keypair to prove the code path signs/verifies correctly, plus a negative test (tampered body must fail).
- Deploy both functions and confirm from the Edge Function logs that live GHL webhooks now log `scheme: ghl` and verify successfully (both headers are still being sent until Sept 1, so this can be confirmed before the cutover).
- Test an install/uninstall round trip against a sandbox location.

## Technical notes

- Deno's Web Crypto supports Ed25519 natively: `crypto.subtle.importKey("spki", ..., { name: "Ed25519" }, false, ["verify"])` then `crypto.subtle.verify("Ed25519", key, sig, body)`. No new dependency.
- Signature is over the **raw request body bytes**, which is already what we pass in (`rawBody`), so no body-handling change.
- Existing base64/hex auto-detection stays for the legacy path; the Ed25519 signature is base64 per the docs.
- After September 1 the legacy branch becomes dead code but is harmless to leave for one release; it can be removed in a later cleanup.

## Note on the MCP request

The "add agent integrations (MCP)" work is unrelated and still open. This signature deprecation has a hard September 1 deadline, so it should ship first; I'll pick MCP back up right after.
