

## Plan: Fix Supabase Anon-Key Root Endpoint Restriction

### Background
On April 8th 2026, Supabase removes anon-key access to the bare `/rest/v1/` root endpoint. Only **one file** in the codebase hits this restricted endpoint: `src/services/supabase/exec-sql.ts`. It's used during initial admin database setup (the `Initialize` flow), not during normal user traffic.

### Scope
- File: `src/services/supabase/exec-sql.ts`
- Used by: `src/services/supabase/init-service.ts` → `DatabaseSetupStep.tsx` (admin setup wizard only)
- Impact: Zero end-user impact today. Will break the "Initialize" / re-setup flow after April 8th if not fixed.

### The Problem
In `exec-sql.ts`, the `createExecSqlFunction` helper does:
```ts
fetch(`${url}/rest/v1/`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}`, apikey: serviceKey, ... },
  body: JSON.stringify({ query: createFunctionSql })
})
```
This call is structurally broken anyway — POSTing JSON `{query: ...}` to `/rest/v1/` is not a valid PostgREST operation and never actually created the function. It only "works" because the rest of the flow falls back to calling the `exec_sql` RPC if it already exists. After April 8th, the request will additionally return `401 Invalid API key` for anon-key callers, and even with the service key the endpoint is not the right way to run DDL.

### The Fix
Replace the broken `/rest/v1/` POST with a proper bootstrap mechanism for the `exec_sql` function. Two clean options:

**Option A (recommended) — Use Supabase Management API via edge function**
- Create a tiny edge function `bootstrap-exec-sql` that uses the service role key (already in secrets as `SUPABASE_SERVICE_ROLE_KEY`) to run the `CREATE OR REPLACE FUNCTION exec_sql(...)` DDL via a direct `pg` connection (using `SUPABASE_DB_URL`, also already in secrets).
- `createExecSqlFunction` invokes this edge function instead of hitting `/rest/v1/`.
- Pros: Clean, secure, future-proof, leverages secrets we already have.

**Option B (simpler) — Document manual creation**
- Remove the auto-create attempt entirely.
- If `exec_sql` RPC call fails with "does not exist", show the existing `showExecSqlHelp` UI in `DatabaseSetupStep.tsx` (already implemented!) instructing the admin to paste the SQL into the Supabase SQL Editor once.
- Pros: Zero new infrastructure. The fallback UI is already built.
- Cons: Slightly less automated for the very first setup.

### Recommendation
**Go with Option B.** The auto-create code path was already broken (POSTing to `/rest/v1/` was never valid PostgREST syntax), and the manual-fallback UI in `DatabaseSetupStep.tsx` already exists and works. This is a one-time setup step that only admins ever see. Removing the broken code is cleaner than building edge-function infrastructure to replace it.

### Changes (Option B)

**1. `src/services/supabase/exec-sql.ts`**
- Remove the `fetch(\`${url}/rest/v1/\`, ...)` block in `createExecSqlFunction`.
- If the initial `rpc('exec_sql', { sql: 'SELECT 1' })` test fails, return `{ success: false, error: 'exec_sql function does not exist — please create it manually via the Supabase SQL Editor' }`.
- Keep the rest of `execSql` intact (it already calls the RPC correctly once the function exists).

**2. `src/components/init/DatabaseSetupStep.tsx`**
- No changes needed — the `showExecSqlHelp` alert already triggers on `error?.includes('exec_sql function')` and shows the SQL snippet to paste.

### Verification
- After the change, re-running the Initialize flow on a fresh Supabase project will surface the existing help dialog with the SQL to paste, instead of silently failing with a misleading error.
- Existing installations (where `exec_sql` already exists) are completely unaffected — the RPC test passes and execution proceeds normally.
- Normal user/chat traffic is unaffected by both the Supabase change and this fix.

### Risk
- Very low. Only touches the one-time admin setup path. The "auto-create" code being removed never actually worked in the first place.

