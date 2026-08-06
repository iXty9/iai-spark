# Update SSO (Keycloak) address to https://id.ixty9.com/

## What I verified

- The Keycloak/SSO endpoint URL is **not stored anywhere in this codebase**. A search across the project found no `id.ixty9.com` or port `5238` reference — only branding strings and the button label (`iXty9 ID`).
- The app only stores SSO **on/off** and **button label** in `app_settings` (`auth_keycloak_enabled`, `auth_keycloak_button_label`), read by `useAuthSettings`.
- Sign-in goes through `supabase.auth.signInWithOAuth({ provider: 'keycloak' })` in `src/contexts/auth/authOperations.ts`, so the issuer URL, client ID and client secret live in the **Supabase dashboard** (Authentication → Providers → Keycloak) of the external project `ymtdtzkskjdqlzhjuesk`.
- New address is live and serving valid OIDC discovery: `https://id.ixty9.com/realms/master/.well-known/openid-configuration` returns issuer `https://id.ixty9.com/realms/master`.
- Old address `https://id.ixty9.com:5238/...` no longer responds at all (connection failed), which is why SSO is broken.

## Steps

1. **You (Supabase dashboard):** Authentication → Providers → Keycloak → set **Realm URL** to `https://id.ixty9.com/realms/<your-realm>` (use `master` unless you use a dedicated realm), keep the existing Client ID/Secret, save.
2. **You (Keycloak admin console at the new address):** confirm the client's Valid Redirect URIs still include the Supabase callback `https://ymtdtzkskjdqlzhjuesk.supabase.co/auth/v1/callback`, plus Web Origins as currently configured.
3. **Me:** once you confirm the dashboard is updated, I run a browser check against the preview: click the `iXty9 ID` button on `/auth` and confirm the redirect lands on `https://id.ixty9.com/realms/.../protocol/openid-connect/auth` (no `:5238`, no error), and report the result.
4. **Me (optional hardening, only if you want it):** currently the SSO endpoint is invisible from the app side. I can add a read-only display of the configured realm URL in Admin → Authentication so future address changes are easier to spot — say the word and I'll include it.

## Notes

- No code changes are required for the address change itself; the redirect back into the app (`/auth`) and scope (`openid`) already work as-is.
- If your realm is not `master`, tell me the realm name and I'll reflect it in the verification step.
