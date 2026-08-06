# Dependabot triage: what actually matters

I scanned the full lockfile (591 packages) against the vulnerability database. There are **no high or critical** advisories, and nothing here is an emergency. But the alert list is misleading: most of it is dev-only build tooling that never ships to your users. Only four packages are actually reachable in the browser at runtime.

## Verdict: 3 things worth doing ASAP (all are simple version bumps)

### 1. DOMPurify 3.2.6 — the most alarming one
18 advisories, all sanitizer-bypass / mutation-XSS issues. This is the one I'd fix today, because it sits directly on your highest-risk data path: the chat renders **AI/n8n/Hermes-generated markdown**, and DOMPurify is the thing standing between that content and script execution. A sanitizer bypass in an app that renders untrusted model output is a real XSS path, not a theoretical one. It's also used on the login/forgot-password email inputs.

Fix: `dompurify` `^3.2.6` → `^3.4.13` (same major, no API change; the existing `sanitizerConfig` and Trusted Types policy in `src/utils/markdown-config.tsx` stay as-is).

### 2. React Router 6.27.0 — open redirect / link-based XSS
Four advisories: open redirect via protocol-relative (`//evil.com`) and backslash paths in `<Link>` / `useNavigate`. Relevant because the app does auth redirects and OAuth callbacks (Keycloak SSO, HighLevel install flow), which is exactly where an attacker-supplied return path could bounce a user off-site mid-login.

Fix: `react-router-dom` `^6.26.2` → `^6.30.4`. Patch release within v6 — **not** the v7 upgrade, which would be a breaking migration.

### 3. @supabase/auth-js 2.69.1 — insecure path routing
Low severity, but it's your auth client. Comes in transitively via `@supabase/supabase-js`.

Fix: bump `@supabase/supabase-js` `^2.49.4` → `^2.112.2` (minor, backward compatible).

## Two minor ones to sweep in the same pass
- `uuid` 11.1.0 → 11.1.1 — buffer bounds check; you only use v4, so no real exposure.
- `mdast-util-to-hast` 13.2.0 — unsanitized class attribute; transitive under `react-markdown`. Refreshing the lockfile picks up the patched 13.x.

## What you can safely defer
Everything else is **dev/build-time only** and not part of the deployed bundle:

`vite`, `esbuild`, `rollup`, `postcss`, `nanoid`, `@eslint/plugin-kit`, `eslint` deps (`ajv`, `flatted`, `js-yaml`, `lodash`, `minimatch`, `brace-expansion`, `picomatch`, `yaml`, `ws`).

These are almost all denial-of-service / ReDoS against your own dev machine or CI, or the well-known "esbuild dev server responds to any origin" issue — which requires an attacker to reach your local dev server. Dependabot counts them because they're in the lockfile, not because they reach production. Worth a scheduled cleanup, not a fire drill.

Note: `vite` 5 → 8 and `react-router` 6 → 7 are both major-version migrations. I'd keep those out of a security patch and plan them separately.

## Technical details

Changes to `package.json`:

```
dompurify:              ^3.2.6   -> ^3.4.13
react-router-dom:       ^6.26.2  -> ^6.30.4
@supabase/supabase-js:  ^2.49.4  -> ^2.112.2
uuid:                   ^11.1.0  -> ^11.1.1
```

Then regenerate the lockfile so the transitive `@supabase/auth-js`, `@remix-run/router`, and `mdast-util-to-hast` entries move to patched versions.

Verification after the bump:
- Typecheck and build must pass clean (Supabase minor bump is the only one with any surface area — its types are additive).
- Smoke test the paths these packages touch: signed-out anonymous chat send/receive, sign-in (password + Keycloak SSO), a chat reply that renders markdown/code blocks, and admin panel navigation.

No database, edge function, or RLS changes are involved.
