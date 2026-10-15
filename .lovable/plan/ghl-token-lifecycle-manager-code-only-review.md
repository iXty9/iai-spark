# GHL token lifecycle manager — code-only review (scratch slice)

Status: CODE/TEST ONLY. Nothing wired, migrated, deployed or invoked. No real tokens, secrets, project database, Supabase or HighLevel calls.
Base: accepted commit `4cb225d0e8480c56182113c3312df322ce346ec4`. The accepted core is used **unchanged** and is referenced, not repeated here:
`.lovable/plan/ghl-company-location-core-code-only-review.md` — `token-core.ts` `7d4b2ac0aff6a2aba4df5777719aef75b4b909c9c9c07596dd16c9170d47c52f`, `token-core.test.ts` `35692dd65609daa4192fb4c21d01613303c731f03a001760878363d7e6f0138a` (re-verified byte-identical; 55/55 pass).

## 1. Ownership and state rules

```text
credential row (authoritative identity = issuer+app_id+grant_id; never companyId alone)
  state: active | recovery_required          generation: monotonic, +1 only in commit
  claim_op/claim_until: single writer (lease from DB clock)

op journal phases
  claimed --authorize_dispatch--> dispatch_authorized --capture--> captured --commit--> committed
     |                               |                               |
     | not_dispatched (core preflight)| provider_rejected (non-2xx)   | validation_rejected (quarantined; target blocked)
     | abandoned (lease expired,      | uncertain (transport fail /   |
     |   proved never dispatched)     |   oversized / capture fail;   +-- adopt (recovery, lease expired) -> replay -> commit
                                      |   target blocked; late capture still accepted)
```
- Order: trusted resolver -> binding metadata (no ciphertext) -> claim (rows locked ascending by credential id) -> reread pair under claim -> core preflight -> `authorize_dispatch` (the only gate before a provider effect) -> provider -> seal+capture -> core validation -> atomic commit (pair + generation + op committed + claim release).
- Claim takeover only when the lease expired **and** the holder is still `claimed`. Any later phase with an expired lease returns `recovery_required`; never a second dispatch. Live lease returns `busy`; the manager polls a bounded number of times (rereads) then returns `busy`.
- Exchange claims parent+child together; parent refresh claims the parent. Two children sharing a parent therefore serialize on the same parent row.
- Recovery replays the sealed response through the same core function using a replay-only transport (one shot; never network) with `now = original received-at`. Commit is idempotent (`already_committed`) and cannot overwrite a newer generation (`stale_generation`).
- `invalid_grant`/non-2xx = `provider_rejected`; the credential is not marked expired and nothing retries. No reconnect logic exists.
- Public vs internal: `describe()` returns a non-secret DTO. `getLocationAccessToken()` and `recoverOperation()` are `@internal`; the token sits in `ServerInternalAccessToken` (redacted in JSON/string/inspect). Errors carry only a code, optional op id and status. No endpoint is added.
- Envelope `ghlenv1`: AES-256-GCM, fresh 12-byte nonce per write, non-extractable injected keys, AAD = [version, keyId, purpose, credentialId, operationId, owner, company, location, generation]. Not compatible with legacy encryption; no import.

## 2. Evidence

Adapter: **real PostgreSQL 17.9**, a new disposable cluster in `/tmp/lcpg`. It listens on a Unix socket only (`listen_addresses=''`), runs as a local unprivileged account, and every psql call uses a cleared environment. Every store RPC is a separate psql session, so the cross-session concurrency is real. Fabricated data only. Deno 2.6.10 with permissions limited to `--allow-run=psql,setpriv --allow-read=<dir>,/tmp/lcpg/pg.log --allow-env=PATH`. No net permission. The provider is a synthetic in-process fake.

Durable (real DB): atomic claim races (24 sessions -> 1 claim), lock ordering with mixed parent/child claims (no deadlock, checked in the server log), grants/RLS/EXECUTE denial for anon/authenticated/PUBLIC, absence of SECURITY DEFINER, `search_path=''`, constraints, crash/recreate recovery, and an **immediate-mode PostgreSQL restart** between capture and recovery.
Model-level only: the "worker processes" are separate manager instances inside one Deno process (each with its own DB sessions). The real JWT/cron resolver and the Supabase edge DB client adapter are NOT implemented. Supabase-specific role behaviour is simulated by same-named local roles with Supabase-like default privileges.

Full run (`bash run-tests.sh`, with type check):
```text
7d4b2ac0aff6a2aba4df5777719aef75b4b909c9c9c07596dd16c9170d47c52f  token-core.ts
35692dd65609daa4192fb4c21d01613303c731f03a001760878363d7e6f0138a  token-core.test.ts
deno 2.6.10 (stable, release, x86_64-unknown-linux-gnu)
PostgreSQL 17.9 on x86_64-pc-linux-gnu, compiled by clang version 21.1.7, 64-bit
ok | 55 passed | 0 failed (25ms)
ok | 6 passed | 0 failed (27ms)
ok | 9 passed | 0 failed (3s)
durability: crash after capture, then IMMEDIATE PostgreSQL restart, then recovery from disk ... ok (1s)
ok | 39 passed | 0 failed (21s)
```
Totals: core 55, crypto 6, SQL 9, manager 39 = **109 passed, 0 failed**.

RED evidence (honest scope):
- Genuine RED->GREEN: the crypto test "wrong key (same id) and unknown key id rejected" failed first (5 passed / 1 failed). Relabelling the key id onto an identical key decrypted, because the key id was not in the AAD. Fix: bind the key id into the AAD; then 6/6 passed.
- Development failures in the manager were test-timing issues (lease shorter than the provider gate; a counter read before the gate). They were fixed in the tests, not the code, and are not claimed as behaviour RED.
- Most manager code was written before its tests. As behaviour-specific substitute evidence, removing one guard at a time (`bash ablate.sh`, `--no-check`, runtime failures only) makes the targeted test fail:
```text
ABLATION [claim takes over an expired lease even after dispatch] filter="expired lease while the old request" -> FAILED | 0 passed | 1 failed | 38 filtered out (771ms)
ABLATION [claim skips expected-generation check] filter="stale reader" -> FAILED | 0 passed | 1 failed | 38 filtered out (588ms)
ABLATION [transport returns before durable capture] filter="crash afterCapture" -> FAILED | 0 passed | 1 failed | 38 filtered out (433ms)
ABLATION [recovery uses restart clock instead of original received-at] filter="crash beforeCommit" -> FAILED | 0 passed | 1 failed | 38 filtered out (1s)
ABLATION [authority check removed (any caller resolves to a grant)] filter="authz: denied caller" -> FAILED | 0 passed | 1 failed | 38 filtered out (507ms)
ABLATION [rejected candidate published anyway] filter="rejected candidate (wrong class)" -> FAILED | 0 passed | 1 failed | 38 filtered out (495ms)
ABLATION [uncertain dispatch does not block the credential] filter="dispatch failure after possible rotation" -> FAILED | 0 passed | 1 failed | 38 filtered out (437ms)
ABLATION [key id not authenticated in AAD] filter="wrong key" -> FAILED | 0 passed | 1 failed | 5 filtered out (35ms)
```

## 3. File manifest (SHA-256, final newline preserved)
| file | sha256 |
|---|---|
| lc-schema.sql | `86bc95bc8b7108dcfe284a967f86b1ed81ac0ec84b1eb350cbdaf7c88897fd2e` |
| lc-test-bootstrap.sql | `e69ee674944853e6db18904f30fc4e63a57febe67ac389fddfc056cd782b0cb7` |
| lc-crypto.ts | `92e1fc1bf5ecbd5d0a7127060c3247ed40cae9664c1a7bd244f1ea551a71e42c` |
| lc-pg-store.ts | `63edd8589a2eae2d5c2bf40377f01e5d1ff8394a999c0ce9747b8571612f31e1` |
| lc-manager.ts | `f8c05a30f9d5385093efed0b9e87f11c5ab285124af90890070fada520e7f7a7` |
| lc-test-helpers.ts | `f80826268e012d2ab971f297d0bb711ec9a6d44b082266459fe9c17d101b000f` |
| lc-crypto.test.ts | `543a5e17579c58d70d9943b2e49bf011dfeb6182ce1078d5020719e7e3c57493` |
| lc-sql.test.ts | `896e9d726b3382723c54cb8d9f05eb78444a0f3aeeee85d4c4400dcaee996125` |
| lc-manager.test.ts | `40c8d36a8bb3bd0b6ae4cc77b57667d7c87d731c0112a536793913f669d539b1` |
| run-tests.sh | `abebb399f1d34ae7de329267469b175b7a800e1adec6073e925b7cb6cf2c670f` |
| ablate.sh | `a81022144bd3a644c9d457b99fde31ecbc5197e638e5b4d8cf9060a0e2b4373c` |

Reproduce: extract the blocks below plus the accepted core into one directory, then run `bash run-tests.sh` (needs `postgres`/`initdb`/`pg_ctl`/`psql` 17 and `setpriv`; creates a local `lcpg` account if missing), then `bash ablate.sh`.

## 4. Future integration map (not wired)
- `ghl-oauth-callback`: insert the credential through `ghl_lc_insert_credential` (gen 1, grant identity) plus the binding; a Company install becomes `company_parent` + `derived_location` children. It needs a real session resolver.
- `ghl-api-proxy` lazy refresh: replace its inline refresh with `getLocationAccessToken` behind a real resolver (not `x-ixty-proxy-secret` + body `user_id`).
- `ghl-token-refresh` (admin): route to the manager with an admin-verified resolver; recovery goes through `recoverOperation`.
- `ghl-token-refresh-cron`: iterate bindings through a cron-secret resolver; `busy` and `recovery_required` are reported, never forced.
- Pilot: **every** old writer that touches the same parent/pair (proxy, admin refresh, cron, callback) must be isolated together. Changing only the proxy would leave uncoordinated spenders.

## 5. Open/live gates
- Live `oauth.write` grant and a real derived-token refresh remain unproved.
- Legacy `ghl_installations` rows: no automatic import; migration format/evidence is undecided.
- Manual resolution of `uncertain` ops (no capture) is a defined stop state with no tool yet.
- No schema application, deployment, resolver adapters or production DB client. Phases 2–7 are on hold.
- The withdrawn inactive-location / universal-reconnect claim is not reinstated.

## 6. Source blocks

### lc-schema.sql
`sha256 86bc95bc8b7108dcfe284a967f86b1ed81ac0ec84b1eb350cbdaf7c88897fd2e`

````sql
-- GHL token lifecycle store. DRAFT ONLY: not a migration, never applied to any project database.
-- Service-only: RLS on, no policies; table and function privileges revoked from PUBLIC/anon/authenticated.
-- All functions are SECURITY INVOKER (no SECURITY DEFINER), search_path = '' and fully qualified.
-- Lease time comes from the database clock (clock_timestamp()), never from the caller.

create table public.ghl_lc_credentials (
  id uuid primary key,
  mode text not null check (mode in ('native_location','company_parent','derived_location','legacy_unknown')),
  issuer text not null check (issuer ~ '^[a-z0-9._-]{1,64}$'),
  app_id text not null check (app_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  grant_id text not null check (grant_id ~ '^[A-Za-z0-9_:.-]{1,128}$'),
  owner_user_id uuid not null,
  company_id text not null check (company_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  location_id text check (location_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  parent_credential_id uuid references public.ghl_lc_credentials(id) on delete restrict,
  generation bigint not null check (generation >= 1),
  envelope text check (length(envelope) <= 32768),
  key_id text check (key_id ~ '^[A-Za-z0-9_-]{1,32}$'),
  expires_at timestamptz,
  refreshable boolean,
  scopes text[] not null default '{}',
  state text not null default 'active' check (state in ('active','recovery_required')),
  claim_op uuid,
  claim_until timestamptz,
  updated_at timestamptz not null default now(),
  -- grant identity, never companyId alone
  unique (issuer, app_id, grant_id),
  check (parent_credential_id is distinct from id),
  check (mode = 'legacy_unknown' or ((mode = 'company_parent') = (location_id is null))),
  check (mode = 'legacy_unknown' or ((mode = 'derived_location') = (parent_credential_id is not null))),
  check (mode = 'legacy_unknown' or (envelope is not null and key_id is not null and expires_at is not null and refreshable is not null)),
  check (mode <> 'legacy_unknown' or envelope is null),
  check ((claim_op is null) = (claim_until is null))
);

create table public.ghl_lc_bindings (
  id uuid primary key,
  installation_id uuid not null unique,
  owner_user_id uuid not null,
  company_id text not null check (company_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  location_id text not null check (location_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  credential_id uuid not null references public.ghl_lc_credentials(id) on delete restrict
);

create table public.ghl_lc_ops (
  id uuid primary key,
  kind text not null check (kind in ('refresh','exchange')),
  target_credential_id uuid not null references public.ghl_lc_credentials(id) on delete restrict,
  parent_credential_id uuid references public.ghl_lc_credentials(id) on delete restrict,
  credential_ids uuid[] not null,
  owner text not null check (owner ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  expected_generation bigint not null,
  parent_generation bigint,
  phase text not null check (phase in ('claimed','dispatch_authorized','captured','committed',
    'validation_rejected','provider_rejected','not_dispatched','uncertain','abandoned')),
  capture_envelope text check (length(capture_envelope) <= 131072),
  capture_key_id text check (capture_key_id ~ '^[A-Za-z0-9_-]{1,32}$'),
  capture_received_at timestamptz,
  error_code text check (error_code ~ '^[a-z_]{1,64}$'),
  provider_status int check (provider_status between 100 and 599),
  result_generation bigint,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check ((kind = 'exchange') = (parent_credential_id is not null)),
  check ((capture_envelope is null) = (capture_key_id is null)),
  check ((capture_envelope is null) = (capture_received_at is null))
);
-- At most one unresolved operation per target credential.
create unique index ghl_lc_ops_one_open_per_target on public.ghl_lc_ops (target_credential_id)
  where phase in ('claimed','dispatch_authorized','captured','uncertain','validation_rejected');

-- ---------- privileges: service-only ----------
revoke all on public.ghl_lc_credentials, public.ghl_lc_bindings, public.ghl_lc_ops from public, anon, authenticated;
grant select, insert, update, delete on public.ghl_lc_credentials, public.ghl_lc_bindings, public.ghl_lc_ops to service_role;
alter table public.ghl_lc_credentials enable row level security;
alter table public.ghl_lc_bindings enable row level security;
alter table public.ghl_lc_ops enable row level security;
-- (no policies: service_role bypasses RLS; every other role is denied)

-- ---------- helpers ----------
create function public.ghl_lc_ms(t timestamptz) returns bigint language sql immutable
  set search_path = '' as $$ select round(extract(epoch from t) * 1000)::bigint $$;
create function public.ghl_lc_ts(ms bigint) returns timestamptz language sql immutable
  set search_path = '' as $$ select to_timestamp(ms / 1000.0) $$;

create function public.ghl_lc_meta(c public.ghl_lc_credentials) returns jsonb language sql stable
  set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'mode', c.mode, 'owner_user_id', c.owner_user_id,
    'company_id', c.company_id, 'location_id', c.location_id, 'parent_credential_id', c.parent_credential_id,
    'generation', c.generation, 'expires_at_ms', public.ghl_lc_ms(c.expires_at), 'refreshable', c.refreshable,
    'state', c.state, 'issuer', c.issuer, 'app_id', c.app_id, 'grant_id', c.grant_id) $$;

-- ---------- seeding (future: OAuth callback, service-only) ----------
create function public.ghl_lc_insert_credential(p jsonb) returns jsonb language plpgsql
  set search_path = '' as $$
declare par public.ghl_lc_credentials;
begin
  if p->>'mode' = 'derived_location' then
    select * into par from public.ghl_lc_credentials where id = (p->>'parent_credential_id')::uuid;
    if par.id is null or par.mode <> 'company_parent' or par.company_id <> p->>'company_id' then
      return jsonb_build_object('status','invalid_parent');
    end if;
  end if;
  insert into public.ghl_lc_credentials (id, mode, issuer, app_id, grant_id, owner_user_id, company_id, location_id,
    parent_credential_id, generation, envelope, key_id, expires_at, refreshable, scopes)
  values ((p->>'id')::uuid, p->>'mode', p->>'issuer', p->>'app_id', p->>'grant_id', (p->>'owner_user_id')::uuid,
    p->>'company_id', p->>'location_id', (p->>'parent_credential_id')::uuid, 1, p->>'envelope', p->>'key_id',
    public.ghl_lc_ts((p->>'expires_at_ms')::bigint), (p->>'refreshable')::boolean,
    coalesce(array(select jsonb_array_elements_text(p->'scopes')), '{}'));
  return jsonb_build_object('status','ok');
end $$;

create function public.ghl_lc_insert_binding(p jsonb) returns jsonb language plpgsql
  set search_path = '' as $$
declare c public.ghl_lc_credentials;
begin
  select * into c from public.ghl_lc_credentials where id = (p->>'credential_id')::uuid;
  if c.id is null then return jsonb_build_object('status','invalid_credential'); end if;
  insert into public.ghl_lc_bindings (id, installation_id, owner_user_id, company_id, location_id, credential_id)
  values ((p->>'id')::uuid, (p->>'installation_id')::uuid, (p->>'owner_user_id')::uuid, p->>'company_id',
    p->>'location_id', c.id);
  return jsonb_build_object('status','ok');
end $$;

-- ---------- reads ----------
-- Binding + credential (+ parent) metadata. No ciphertext.
create function public.ghl_lc_get_binding(p jsonb) returns jsonb language plpgsql stable
  set search_path = '' as $$
declare b public.ghl_lc_bindings; c public.ghl_lc_credentials; par public.ghl_lc_credentials;
begin
  select * into b from public.ghl_lc_bindings where installation_id = (p->>'installation_id')::uuid;
  if b.id is null then return jsonb_build_object('status','not_found'); end if;
  select * into c from public.ghl_lc_credentials where id = b.credential_id;
  if c.parent_credential_id is not null then
    select * into par from public.ghl_lc_credentials where id = c.parent_credential_id;
  end if;
  return jsonb_build_object('status','ok',
    'binding', jsonb_build_object('installation_id', b.installation_id, 'owner_user_id', b.owner_user_id,
      'company_id', b.company_id, 'location_id', b.location_id, 'credential_id', b.credential_id),
    'credential', public.ghl_lc_meta(c),
    'parent', case when par.id is null then null else public.ghl_lc_meta(par) end);
end $$;

-- Unclaimed read of the active pair (reuse path). Generation returned so the caller binds decryption to it.
create function public.ghl_lc_read_active(p jsonb) returns jsonb language plpgsql stable
  set search_path = '' as $$
declare c public.ghl_lc_credentials;
begin
  select * into c from public.ghl_lc_credentials where id = (p->>'credential_id')::uuid;
  if c.id is null then return jsonb_build_object('status','not_found'); end if;
  if c.mode = 'legacy_unknown' then return jsonb_build_object('status','unknown_mode'); end if;
  if c.state <> 'active' then return jsonb_build_object('status','recovery_required'); end if;
  return jsonb_build_object('status','ok','meta', public.ghl_lc_meta(c),'envelope', c.envelope,'key_id', c.key_id);
end $$;

-- Read under an owned, still-'claimed' operation (post-claim reread).
create function public.ghl_lc_read_claimed(p jsonb) returns jsonb language plpgsql stable
  set search_path = '' as $$
declare o public.ghl_lc_ops; c public.ghl_lc_credentials;
begin
  select * into o from public.ghl_lc_ops where id = (p->>'op_id')::uuid;
  select * into c from public.ghl_lc_credentials where id = (p->>'credential_id')::uuid;
  if o.id is null or c.id is null or o.owner <> p->>'owner' or c.claim_op is distinct from o.id
     or not (c.id = any(o.credential_ids)) then
    return jsonb_build_object('status','lost');
  end if;
  return jsonb_build_object('status','ok','meta', public.ghl_lc_meta(c),'envelope', c.envelope,'key_id', c.key_id);
end $$;

-- ---------- claim: deterministic lock order (credential id ascending) ----------
create function public.ghl_lc_claim(p jsonb) returns jsonb language plpgsql
  set search_path = '' as $$
declare
  v_op uuid := (p->>'op_id')::uuid;
  v_target uuid := (p->>'target_credential_id')::uuid;
  v_parent uuid := (p->>'parent_credential_id')::uuid;
  v_ids uuid[];
  v_lease int := (p->>'lease_ms')::int;
  r public.ghl_lc_credentials;
  ph text;
  n int;
begin
  if v_lease is null or v_lease < 50 or v_lease > 120000 then return jsonb_build_object('status','invalid_lease'); end if;
  v_ids := array(select x from unnest(array_remove(array[v_target, v_parent], null)) x order by x);
  -- lock every involved row in ascending id order: no lock-order inversion between refresh and exchange
  perform 1 from public.ghl_lc_credentials where id = any(v_ids) order by id for update;
  get diagnostics n = row_count;
  if n <> array_length(v_ids, 1) then return jsonb_build_object('status','not_found'); end if;
  for r in select * from public.ghl_lc_credentials where id = any(v_ids) order by id loop
    if r.mode = 'legacy_unknown' then return jsonb_build_object('status','unknown_mode'); end if;
    if r.state <> 'active' then return jsonb_build_object('status','recovery_required','credential_id', r.id); end if;
    if r.claim_op is not null then
      select phase into ph from public.ghl_lc_ops where id = r.claim_op;
      if r.claim_until > clock_timestamp() then
        return jsonb_build_object('status','busy','credential_id', r.id);
      elsif ph = 'claimed' then
        -- Expired lease and the holder never passed the dispatch transition: proved not dispatched.
        update public.ghl_lc_ops set phase = 'abandoned', error_code = 'lease_expired_predispatch',
          updated_at = clock_timestamp() where id = r.claim_op and phase = 'claimed';
        update public.ghl_lc_credentials set claim_op = null, claim_until = null where claim_op = r.claim_op;
      else
        -- Holder may have dispatched (or captured): never take over, never redispatch.
        return jsonb_build_object('status','recovery_required','credential_id', r.id);
      end if;
    end if;
  end loop;
  select * into r from public.ghl_lc_credentials where id = v_target;
  if r.generation <> (p->>'expected_generation')::bigint then
    return jsonb_build_object('status','stale_generation','generation', r.generation);
  end if;
  if v_parent is not null then
    select * into r from public.ghl_lc_credentials where id = v_parent;
    if r.generation <> (p->>'parent_generation')::bigint then
      return jsonb_build_object('status','stale_generation','generation', r.generation);
    end if;
  end if;
  insert into public.ghl_lc_ops (id, kind, target_credential_id, parent_credential_id, credential_ids, owner,
    expected_generation, parent_generation, phase)
  values (v_op, p->>'kind', v_target, v_parent, v_ids, p->>'owner', (p->>'expected_generation')::bigint,
    (p->>'parent_generation')::bigint, 'claimed');
  update public.ghl_lc_credentials set claim_op = v_op,
    claim_until = clock_timestamp() + make_interval(secs => v_lease / 1000.0), updated_at = clock_timestamp()
    where id = any(v_ids);
  return jsonb_build_object('status','claimed');
end $$;

-- The ONLY gate to a provider side effect. Intent is already durable (op row) before this runs.
create function public.ghl_lc_authorize_dispatch(p jsonb) returns jsonb language plpgsql
  set search_path = '' as $$
declare o public.ghl_lc_ops; n int;
begin
  select * into o from public.ghl_lc_ops where id = (p->>'op_id')::uuid for update;
  if o.id is null or o.owner <> p->>'owner' or o.phase <> 'claimed' then return jsonb_build_object('status','lost'); end if;
  perform 1 from public.ghl_lc_credentials where id = any(o.credential_ids) order by id for update;
  select count(*) into n from public.ghl_lc_credentials
    where id = any(o.credential_ids) and claim_op = o.id and claim_until > clock_timestamp() and state = 'active';
  if n <> array_length(o.credential_ids, 1) then return jsonb_build_object('status','lost'); end if;
  update public.ghl_lc_ops set phase = 'dispatch_authorized', updated_at = clock_timestamp() where id = o.id;
  return jsonb_build_object('status','ok');
end $$;

-- Seal a token-bearing provider response before the core sees it. Also accepted after 'uncertain'
-- (late response), so evidence is never discarded.
create function public.ghl_lc_capture(p jsonb) returns jsonb language plpgsql
  set search_path = '' as $$
declare o public.ghl_lc_ops;
begin
  select * into o from public.ghl_lc_ops where id = (p->>'op_id')::uuid for update;
  if o.id is null or o.owner <> p->>'owner' or o.phase not in ('dispatch_authorized','uncertain') then
    return jsonb_build_object('status','lost');
  end if;
  update public.ghl_lc_ops set phase = 'captured', capture_envelope = p->>'envelope', capture_key_id = p->>'key_id',
    capture_received_at = public.ghl_lc_ts((p->>'received_at_ms')::bigint), provider_status = (p->>'provider_status')::int,
    error_code = null, updated_at = clock_timestamp() where id = o.id;
  return jsonb_build_object('status','ok');
end $$;

-- Atomic, idempotent publication: new pair + generation + op completion + claim release.
create function public.ghl_lc_commit(p jsonb) returns jsonb language plpgsql
  set search_path = '' as $$
declare o public.ghl_lc_ops; t public.ghl_lc_credentials; par public.ghl_lc_credentials;
begin
  select * into o from public.ghl_lc_ops where id = (p->>'op_id')::uuid for update;
  if o.id is null then return jsonb_build_object('status','lost'); end if;
  if o.phase = 'committed' then return jsonb_build_object('status','already_committed','generation', o.result_generation); end if;
  if o.owner <> p->>'owner' or o.phase <> 'captured' then return jsonb_build_object('status','lost'); end if;
  perform 1 from public.ghl_lc_credentials where id = any(o.credential_ids) order by id for update;
  select * into t from public.ghl_lc_credentials where id = o.target_credential_id;
  if t.claim_op is distinct from o.id or t.generation <> o.expected_generation then
    return jsonb_build_object('status','stale_generation');
  end if;
  if o.parent_credential_id is not null then
    select * into par from public.ghl_lc_credentials where id = o.parent_credential_id;
    if par.claim_op is distinct from o.id or par.generation <> o.parent_generation then
      return jsonb_build_object('status','stale_generation');
    end if;
  end if;
  update public.ghl_lc_credentials set generation = t.generation + 1, envelope = p->>'envelope', key_id = p->>'key_id',
    expires_at = public.ghl_lc_ts((p->>'expires_at_ms')::bigint), refreshable = (p->>'refreshable')::boolean,
    scopes = coalesce(array(select jsonb_array_elements_text(p->'scopes')), '{}'), state = 'active',
    updated_at = clock_timestamp() where id = t.id;
  update public.ghl_lc_credentials set claim_op = null, claim_until = null where claim_op = o.id;
  update public.ghl_lc_ops set phase = 'committed', result_generation = t.generation + 1,
    updated_at = clock_timestamp() where id = o.id;
  return jsonb_build_object('status','committed','generation', t.generation + 1);
end $$;

-- Terminal / blocking outcomes.
create function public.ghl_lc_finish(p jsonb) returns jsonb language plpgsql
  set search_path = '' as $$
declare o public.ghl_lc_ops; v_out text := p->>'outcome'; v_from text;
begin
  select * into o from public.ghl_lc_ops where id = (p->>'op_id')::uuid for update;
  v_from := case v_out when 'not_dispatched' then 'claimed' when 'provider_rejected' then 'dispatch_authorized'
    when 'uncertain' then 'dispatch_authorized' when 'validation_rejected' then 'captured' else null end;
  if v_from is null then return jsonb_build_object('status','invalid_outcome'); end if;
  if o.id is null or o.owner <> p->>'owner' or o.phase <> v_from then return jsonb_build_object('status','lost'); end if;
  perform 1 from public.ghl_lc_credentials where id = any(o.credential_ids) order by id for update;
  update public.ghl_lc_ops set phase = v_out, error_code = p->>'error_code',
    provider_status = coalesce((p->>'provider_status')::int, provider_status), updated_at = clock_timestamp()
    where id = o.id;
  if v_out = 'uncertain' then
    -- keep claims (adoption possible if a late response is captured); block the target
    update public.ghl_lc_credentials set state = 'recovery_required' where id = o.target_credential_id;
  elsif v_out = 'validation_rejected' then
    update public.ghl_lc_credentials set state = 'recovery_required' where id = o.target_credential_id;
    update public.ghl_lc_credentials set claim_op = null, claim_until = null where claim_op = o.id;
  else
    update public.ghl_lc_credentials set claim_op = null, claim_until = null where claim_op = o.id;
  end if;
  return jsonb_build_object('status','ok');
end $$;

-- Recovery: take ownership of a CAPTURED op after its lease expired (or by the same owner).
create function public.ghl_lc_adopt(p jsonb) returns jsonb language plpgsql
  set search_path = '' as $$
declare o public.ghl_lc_ops; v_live int;
begin
  select * into o from public.ghl_lc_ops where id = (p->>'op_id')::uuid for update;
  if o.id is null then return jsonb_build_object('status','not_found'); end if;
  if o.phase = 'committed' then return jsonb_build_object('status','already_committed','generation', o.result_generation); end if;
  if o.phase <> 'captured' then return jsonb_build_object('status','not_recoverable','phase', o.phase); end if;
  perform 1 from public.ghl_lc_credentials where id = any(o.credential_ids) order by id for update;
  select count(*) into v_live from public.ghl_lc_credentials
    where claim_op = o.id and claim_until > clock_timestamp();
  if v_live > 0 and o.owner <> p->>'owner' then return jsonb_build_object('status','busy'); end if;
  update public.ghl_lc_ops set owner = p->>'owner', updated_at = clock_timestamp() where id = o.id;
  update public.ghl_lc_credentials set claim_op = o.id,
    claim_until = clock_timestamp() + make_interval(secs => greatest(50, least(120000, (p->>'lease_ms')::int)) / 1000.0)
    where id = any(o.credential_ids);
  return jsonb_build_object('status','adopted','kind', o.kind, 'target_credential_id', o.target_credential_id,
    'parent_credential_id', o.parent_credential_id, 'expected_generation', o.expected_generation,
    'parent_generation', o.parent_generation, 'capture_envelope', o.capture_envelope,
    'capture_key_id', o.capture_key_id, 'received_at_ms', public.ghl_lc_ms(o.capture_received_at));
end $$;

create function public.ghl_lc_get_op(p jsonb) returns jsonb language sql stable
  set search_path = '' as $$
  select coalesce((select jsonb_build_object('status','ok','phase', phase, 'kind', kind, 'error_code', error_code,
    'target_credential_id', target_credential_id, 'result_generation', result_generation,
    'has_capture', capture_envelope is not null)
    from public.ghl_lc_ops where id = (p->>'op_id')::uuid), jsonb_build_object('status','not_found')) $$;

-- ---------- function privileges: service-only ----------
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'ghl\_lc\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
````

### lc-test-bootstrap.sql
`sha256 e69ee674944853e6db18904f30fc4e63a57febe67ac389fddfc056cd782b0cb7`

````sql
-- Scratch-only bootstrap for the disposable local cluster (socket-only, no TCP listener).
-- Mirrors Supabase role names and its permissive default privileges so the schema's revokes are really exercised.
create role anon login nobypassrls;
create role authenticated login nobypassrls;
create role service_role login bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
````

### lc-crypto.ts
`sha256 92e1fc1bf5ecbd5d0a7127060c3247ed40cae9664c1a7bd244f1ea551a71e42c`

````ts
// AES-256-GCM envelope for GHL credential material. SERVER-INTERNAL.
// Keys are injected (CryptoKey, non-extractable); never stored with ciphertext, never logged.
// Envelope format v1: "ghlenv1.<keyId>.<b64url nonce(12)>.<b64url ciphertext+tag>"
// AAD = canonical JSON of version + key id + binding, so ciphertext moved to another credential/op/generation fails to open.
// Not compatible with the legacy ghl_installations encryption; no automatic import.

export const ENVELOPE_VERSION = 'ghlenv1';
export const MAX_PLAINTEXT = 96 * 1024;
const MAX_ENVELOPE = 140 * 1024;
const KID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const B64URL_RE = /^[A-Za-z0-9_-]+$/;

export type Purpose = 'active_pair' | 'capture';
export interface EnvelopeBinding {
  purpose: Purpose;
  credentialId: string;
  operationId: string | null;
  ownerUserId: string;
  companyId: string;
  locationId: string | null;
  generation: number;
}
export interface Keyring { activeKeyId: string; keys: ReadonlyMap<string, CryptoKey> }

export class EnvelopeError extends Error {
  constructor(public readonly code: string) { super(code); this.name = 'EnvelopeError'; }
  toJSON() { return { code: this.code }; }
}
const fail = (code: string): never => { throw new EnvelopeError(code); };

function b64u(bytes: Uint8Array): string {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function unb64u(s: string): Uint8Array<ArrayBuffer> {
  if (!B64URL_RE.test(s)) fail('envelope_malformed');
  const p = s.replaceAll('-', '+').replaceAll('_', '/');
  try { return Uint8Array.from(atob(p + '='.repeat((4 - (p.length % 4)) % 4)), (c) => c.charCodeAt(0)); }
  catch { return fail('envelope_malformed'); }
}
function aad(b: EnvelopeBinding, keyId: string): Uint8Array<ArrayBuffer> {
  if (b.purpose !== 'active_pair' && b.purpose !== 'capture') fail('invalid_binding');
  if (!Number.isSafeInteger(b.generation) || b.generation < 1) fail('invalid_binding');
  for (const v of [b.credentialId, b.ownerUserId, b.companyId]) if (typeof v !== 'string' || !v) fail('invalid_binding');
  if (b.purpose === 'capture' ? typeof b.operationId !== 'string' || !b.operationId : b.operationId !== null) fail('invalid_binding');
  return new Uint8Array(new TextEncoder().encode(JSON.stringify([ENVELOPE_VERSION, keyId, b.purpose, b.credentialId, b.operationId,
    b.ownerUserId, b.companyId, b.locationId, b.generation])));
}

export function validateKeyring(k: Keyring): void {
  if (!k || !KID_RE.test(k.activeKeyId) || !(k.keys instanceof Map) || !k.keys.get(k.activeKeyId)) fail('invalid_keyring');
  for (const [id, key] of k.keys) {
    if (!KID_RE.test(id) || !(key instanceof CryptoKey) || key.algorithm.name !== 'AES-GCM' ||
        (key.algorithm as AesKeyAlgorithm).length !== 256 || key.extractable) fail('invalid_keyring');
  }
}

export async function seal(k: Keyring, b: EnvelopeBinding, plaintext: string): Promise<{ envelope: string; keyId: string }> {
  validateKeyring(k);
  const pt = new Uint8Array(new TextEncoder().encode(plaintext));
  if (pt.length === 0 || pt.length > MAX_PLAINTEXT) fail('plaintext_size');
  const iv = crypto.getRandomValues(new Uint8Array(12)); // fresh nonce per write
  let ct: ArrayBuffer;
  try { ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(b, k.activeKeyId), tagLength: 128 }, k.keys.get(k.activeKeyId)!, pt); }
  catch (e) { if (e instanceof EnvelopeError) throw e; return fail('seal_failed'); }
  return { envelope: `${ENVELOPE_VERSION}.${k.activeKeyId}.${b64u(iv)}.${b64u(new Uint8Array(ct))}`, keyId: k.activeKeyId };
}

export async function open(k: Keyring, b: EnvelopeBinding, envelope: unknown, keyId: unknown): Promise<string> {
  validateKeyring(k);
  if (typeof envelope !== 'string' || envelope.length > MAX_ENVELOPE) fail('envelope_malformed');
  const parts = (envelope as string).split('.');
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) fail('envelope_version');
  if (!KID_RE.test(parts[1]) || parts[1] !== keyId) fail('envelope_malformed');
  const key = k.keys.get(parts[1]);
  if (!key) fail('unknown_key');
  const iv = unb64u(parts[2]); const ct = unb64u(parts[3]);
  if (iv.length !== 12 || ct.length < 17) fail('envelope_malformed');
  const ad = aad(b, parts[1]);
  let pt: ArrayBuffer;
  try { pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: ad, tagLength: 128 }, key!, ct); }
  catch { return fail('envelope_auth_failed'); }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(pt); } catch { return fail('envelope_auth_failed'); }
}

/** Test/bootstrap helper: import raw 32 bytes as a NON-extractable AES-256-GCM key. */
export async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  if (!(raw instanceof Uint8Array) || raw.length !== 32) fail('invalid_key_material');
  return await crypto.subtle.importKey('raw', new Uint8Array(raw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
````

### lc-pg-store.ts
`sha256 63edd8589a2eae2d5c2bf40377f01e5d1ff8394a999c0ce9747b8571612f31e1`

````ts
// PostgreSQL store adapter for the lifecycle manager. SERVER-INTERNAL.
// Scratch transport: each call is a separate psql session over a local Unix socket (no TCP), with a cleared
// environment so no ambient PG* variables can redirect it. Future production adapter: same RPC names via a
// service-role database client inside the edge runtime. Only fixed RPC names are callable.

export type Rpc =
  | 'ghl_lc_get_binding' | 'ghl_lc_read_active' | 'ghl_lc_read_claimed' | 'ghl_lc_claim'
  | 'ghl_lc_authorize_dispatch' | 'ghl_lc_capture' | 'ghl_lc_commit' | 'ghl_lc_finish'
  | 'ghl_lc_adopt' | 'ghl_lc_get_op' | 'ghl_lc_insert_credential' | 'ghl_lc_insert_binding';
const RPCS: ReadonlySet<string> = new Set<Rpc>(['ghl_lc_get_binding', 'ghl_lc_read_active', 'ghl_lc_read_claimed',
  'ghl_lc_claim', 'ghl_lc_authorize_dispatch', 'ghl_lc_capture', 'ghl_lc_commit', 'ghl_lc_finish', 'ghl_lc_adopt',
  'ghl_lc_get_op', 'ghl_lc_insert_credential', 'ghl_lc_insert_binding']);

export interface LcStore { call(fn: Rpc, args: Record<string, unknown>): Promise<Record<string, unknown>> }

export class StoreError extends Error {
  constructor(public readonly code: string) { super(code); this.name = 'StoreError'; }
  toJSON() { return { code: this.code }; }
}

export interface PgSocketConfig { socketDir: string; port: number; database: string; role: string }

export class PgPsqlStore implements LcStore {
  constructor(private readonly cfg: PgSocketConfig) {
    if (!cfg.socketDir.startsWith('/') || !/^[a-z_][a-z0-9_]{0,62}$/.test(cfg.database) || !/^[a-z_][a-z0-9_]{0,62}$/.test(cfg.role) ||
        !Number.isInteger(cfg.port)) throw new StoreError('invalid_store_config');
  }
  async call(fn: Rpc, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!RPCS.has(fn)) throw new StoreError('unknown_rpc');
    const out = await psql(this.cfg, `select public.${fn}(:'a'::jsonb);`, ['-v', `a=${JSON.stringify(args)}`]);
    if (out.code !== 0) throw new StoreError('storage_failed'); // never surface stderr (may echo arguments)
    try { const v = JSON.parse(out.stdout.trim()); if (v && typeof v === 'object') return v; } catch { /* fallthrough */ }
    throw new StoreError('storage_bad_response');
  }
}

export async function psql(cfg: PgSocketConfig, sql: string, extra: string[] = []): Promise<{ code: number; stdout: string; stderr: string }> {
  const cmd = new Deno.Command('psql', {
    args: ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-h', cfg.socketDir, '-p', String(cfg.port),
      '-U', cfg.role, '-d', cfg.database, ...extra],
    clearEnv: true, env: { PATH: Deno.env.get('PATH') ?? '/bin' },
    stdin: 'piped', stdout: 'piped', stderr: 'piped',
  });
  const child = cmd.spawn();
  const w = child.stdin.getWriter(); await w.write(new TextEncoder().encode(sql)); await w.close();
  const r = await child.output();
  return { code: r.code, stdout: new TextDecoder().decode(r.stdout), stderr: new TextDecoder().decode(r.stderr) };
}
````

### lc-manager.ts
`sha256 f8c05a30f9d5385093efed0b9e87f11c5ab285124af90890070fada520e7f7a7`

````ts
// GHL credential lifecycle manager. SERVER-INTERNAL ONLY: no HTTP endpoint, never imported by browser code.
// Uses the accepted token core UNCHANGED for every provider contract and validation rule.
// All effects are injected: store, keyring, provider transport, clock, configuration, authority resolver.
import * as core from './token-core.ts';
import { type EnvelopeBinding, EnvelopeError, type Keyring, open, seal, validateKeyring } from './lc-crypto.ts';
import { type LcStore, StoreError } from './lc-pg-store.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const WORKER_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
const CODE_RE = /^[a-z_]{1,64}$/;
const MAX_CAPTURE_BODY = 64 * 1024; // same bound as the core's MAX_BODY

/** Fixed-code error. Carries only a code, optional HTTP status and optional (non-secret) operation id. */
export class LifecycleError extends Error {
  constructor(public readonly code: string, public readonly opId?: string, public readonly status?: number) {
    super(code); this.name = 'LifecycleError';
  }
  toJSON() { return { code: this.code, opId: this.opId ?? null, status: this.status ?? null }; }
}
/** Test-only fault: models process death. Manager performs NO cleanup when it sees one. */
export class SimulatedCrash extends Error { constructor(public readonly at: string) { super('simulated_crash'); } }

/** @internal Raw access token holder. Redacts itself in JSON, string and inspect output. */
export class ServerInternalAccessToken {
  #v: string;
  constructor(v: string) { this.#v = v; }
  reveal(): string { return this.#v; }
  toJSON() { return '[redacted]'; }
  toString() { return '[redacted]'; }
  [Symbol.for('Deno.customInspect')]() { return '[redacted]'; }
}
export interface TokenLease { accessToken: ServerInternalAccessToken; expiresAtMs: number; generation: number; mode: core.Mode }
/** Public-safe DTO. */
export interface CredentialStatus { mode: string; state: string; generation: number; expiresAtMs: number | null; refreshable: boolean | null }

/** Produced ONLY by a trusted server-side resolver (verified session/JWT, cron secret...). Never from a request body. */
export interface AuthorityGrant { installationId: string; ownerUserId: string; action: 'use' | 'recover' }
export type AuthorityResolver = (caller: unknown) => Promise<AuthorityGrant | null>;

export interface ManagerConfig {
  clientId: string; clientSecret: string;
  expirySkewMs: number; leaseMs: number; busyPollAttempts: number; busyPollDelayMs: number;
}
export type FaultPoint = 'afterClaim' | 'afterAuthorize' | 'afterCapture' | 'beforeCommit' | 'afterCommit';
export type FaultHooks = Partial<Record<FaultPoint, (opId: string) => void | Promise<void>>>;
export interface LogEvent { event: string; code: string; opId?: string }

export interface ManagerDeps {
  store: LcStore; keyring: Keyring; transport: core.Transport; now: () => number; config: ManagerConfig;
  resolveAuthority: AuthorityResolver; workerId: string;
  log?: (e: LogEvent) => void; faults?: FaultHooks; sleep?: (ms: number) => Promise<void>; newId?: () => string;
}

interface Meta {
  id: string; mode: string; owner_user_id: string; company_id: string; location_id: string | null;
  parent_credential_id: string | null; generation: number; expires_at_ms: number | null; refreshable: boolean | null; state: string;
}
interface Resolved { binding: { installation_id: string; owner_user_id: string; company_id: string; location_id: string; credential_id: string }; cred: Meta; parent: Meta | null }
type OpResult = { kind: 'done'; cred: core.Credential; generation: number } | { kind: 'retry' };

const isStr = (v: unknown, max = 512): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && v.trim() === v;
const isInt = (v: unknown, lo: number, hi: number) => Number.isSafeInteger(v) && (v as number) >= lo && (v as number) <= hi;

export class LifecycleManager {
  readonly #d: ManagerDeps;
  constructor(d: ManagerDeps) {
    const c = d?.config;
    if (!d || !c || !isStr(c.clientId) || !isStr(c.clientSecret) || /\s/.test(c.clientId + c.clientSecret) ||
        !isInt(c.expirySkewMs, 0, 3_600_000) || !isInt(c.leaseMs, 50, 120_000) ||
        !isInt(c.busyPollAttempts, 0, 20) || !isInt(c.busyPollDelayMs, 0, 5_000) ||
        typeof d.now !== 'function' || typeof d.transport !== 'function' || typeof d.resolveAuthority !== 'function' ||
        !d.store || typeof d.store.call !== 'function' || !WORKER_RE.test(d.workerId ?? '')) {
      throw new LifecycleError('invalid_config');
    }
    try { validateKeyring(d.keyring); } catch { throw new LifecycleError('invalid_config'); }
    this.#d = { sleep: (ms) => new Promise((r) => setTimeout(r, ms)), newId: () => crypto.randomUUID(), log: () => {}, ...d };
  }

  // ------------------------------------------------------------------ public-safe
  async describe(caller: unknown): Promise<CredentialStatus> {
    return await this.#guard(async () => {
      const r = await this.#authorize(caller, 'use');
      return { mode: r.cred.mode, state: r.cred.state, generation: r.cred.generation, expiresAtMs: r.cred.expires_at_ms, refreshable: r.cred.refreshable };
    });
  }

  // ------------------------------------------------------------------ server-internal
  /** @internal Returns a usable Location access token for the AUTHORIZED installation only. */
  async getLocationAccessToken(caller: unknown): Promise<TokenLease> {
    return await this.#guard(async () => {
      let r = await this.#authorize(caller, 'use');
      const maxIter = this.#d.config.busyPollAttempts + 3;
      for (let i = 0; i < maxIter; i++) {
        if (i > 0) r = await this.#load(r.binding.installation_id, r.binding.owner_user_id);
        const { cred, parent } = r;
        if (cred.state !== 'active') throw new LifecycleError('recovery_required');
        if (this.#fresh(cred)) return await this.#leaseFromActive(cred);
        let res: OpResult;
        if (cred.refreshable) {
          res = await this.#runOp('refresh', cred, null);
        } else {
          // access-only derived child: re-derive from its complete Company parent
          if (!parent || parent.state !== 'active') throw new LifecycleError('recovery_required');
          if (!this.#fresh(parent)) {
            if (!parent.refreshable) throw new LifecycleError('incoherent_credential');
            res = await this.#runOp('refresh', parent, null);
            continue; // reread: parent rotated (or someone else did); then derive under a new claim
          }
          res = await this.#runOp('exchange', cred, parent);
        }
        if (res.kind === 'done') {
          return { accessToken: new ServerInternalAccessToken(res.cred.accessToken), expiresAtMs: res.cred.expiresAt, generation: res.generation, mode: res.cred.mode };
        }
      }
      throw new LifecycleError('busy');
    });
  }

  /** @internal Revalidate and publish a CAPTURED candidate with no network: replay-only transport. */
  async recoverOperation(caller: unknown, opId: string): Promise<{ status: 'committed'; generation: number }> {
    return await this.#guard(async () => {
      if (typeof opId !== 'string' || !UUID_RE.test(opId)) throw new LifecycleError('invalid_operation');
      const r = await this.#authorize(caller, 'recover');
      const op = await this.#call('ghl_lc_get_op', { op_id: opId });
      if (op.status !== 'ok') throw new LifecycleError('operation_not_found');
      const target = op.target_credential_id === r.cred.id ? r.cred : (r.parent && op.target_credential_id === r.parent.id ? r.parent : null);
      if (!target) throw new LifecycleError('binding_mismatch');
      const a = await this.#call('ghl_lc_adopt', { op_id: opId, owner: this.#d.workerId, lease_ms: this.#d.config.leaseMs });
      if (a.status === 'already_committed') return { status: 'committed', generation: Number(a.generation) };
      if (a.status === 'not_recoverable') throw new LifecycleError('manual_recovery_required', opId);
      if (a.status !== 'adopted') throw new LifecycleError(a.status === 'busy' ? 'busy' : 'recovery_failed', opId);
      const kind = a.kind as 'refresh' | 'exchange';
      const expected = Number(a.expected_generation);
      if (target.generation !== expected) throw new LifecycleError('stale_generation', opId);
      const parent = kind === 'exchange' ? r.parent : null;
      if (kind === 'exchange' && (!parent || parent.id !== a.parent_credential_id || parent.generation !== Number(a.parent_generation))) {
        throw new LifecycleError('stale_generation', opId);
      }
      const capturedText = await open(this.#d.keyring, this.#captureBinding(target, opId), a.capture_envelope, a.capture_key_id);
      const cap = JSON.parse(capturedText) as core.HttpResponse;
      const tCred = await this.#readClaimed(target, opId);
      const pCred = parent ? await this.#readClaimed(parent, opId) : null;
      let used = false;
      const replay: core.Transport = async () => { // never falls through to a network transport
        if (used) throw new Error('replay_exhausted');
        used = true;
        return { status: cap.status, url: cap.url, redirected: cap.redirected, headers: {}, bodyText: cap.bodyText };
      };
      const receivedAt = Number(a.received_at_ms);
      let out: core.Credential;
      try {
        out = await this.#invokeCore(kind, { transport: replay, now: () => receivedAt }, target, tCred, pCred);
      } catch (e) {
        const code = this.#codeOf(e);
        await this.#finish(opId, 'validation_rejected', code);
        throw new LifecycleError(code, opId);
      }
      const res = await this.#publish(opId, target, out);
      return { status: 'committed', generation: res.generation };
    });
  }

  // ------------------------------------------------------------------ internals
  #fresh(m: Meta): boolean {
    const now = this.#now();
    return typeof m.expires_at_ms === 'number' && m.expires_at_ms - this.#d.config.expirySkewMs > now;
  }
  #now(): number {
    const n = this.#d.now();
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) throw new LifecycleError('invalid_clock');
    return n;
  }

  async #authorize(caller: unknown, action: 'use' | 'recover'): Promise<Resolved> {
    let g: AuthorityGrant | null;
    try { g = await this.#d.resolveAuthority(caller); } catch { throw new LifecycleError('authority_unavailable'); }
    if (!g || typeof g !== 'object' || g.action !== action || typeof g.installationId !== 'string' ||
        !UUID_RE.test(g.installationId) || typeof g.ownerUserId !== 'string' || !UUID_RE.test(g.ownerUserId)) {
      throw new LifecycleError('unauthorized');
    }
    return await this.#load(g.installationId, g.ownerUserId);
  }

  async #load(installationId: string, ownerUserId: string): Promise<Resolved> {
    const b = await this.#call('ghl_lc_get_binding', { installation_id: installationId });
    if (b.status !== 'ok') throw new LifecycleError('unauthorized');
    const binding = b.binding as Resolved['binding'];
    const cred = b.credential as Meta;
    const parent = (b.parent ?? null) as Meta | null;
    if (binding.owner_user_id !== ownerUserId || cred.id !== binding.credential_id || cred.owner_user_id !== binding.owner_user_id) {
      throw new LifecycleError('binding_mismatch');
    }
    if (cred.mode === 'legacy_unknown') throw new LifecycleError('unknown_mode');
    if (cred.mode !== 'native_location' && cred.mode !== 'derived_location') throw new LifecycleError('binding_mismatch');
    if (cred.company_id !== binding.company_id || cred.location_id !== binding.location_id) throw new LifecycleError('binding_mismatch');
    if (cred.mode === 'native_location' && (cred.parent_credential_id !== null || parent !== null)) throw new LifecycleError('incoherent_credential');
    if (cred.mode === 'derived_location') {
      if (!parent || parent.id !== cred.parent_credential_id) throw new LifecycleError('incoherent_credential');
      if (parent.mode === 'legacy_unknown') throw new LifecycleError('unknown_mode');
      if (parent.mode !== 'company_parent' || parent.company_id !== cred.company_id || parent.location_id !== null) {
        throw new LifecycleError('incoherent_credential');
      }
    }
    return { binding, cred, parent };
  }

  #activeBinding(m: Meta, generation: number): EnvelopeBinding {
    return { purpose: 'active_pair', credentialId: m.id, operationId: null, ownerUserId: m.owner_user_id,
      companyId: m.company_id, locationId: m.location_id, generation };
  }
  #captureBinding(m: Meta, opId: string): EnvelopeBinding {
    return { purpose: 'capture', credentialId: m.id, operationId: opId, ownerUserId: m.owner_user_id,
      companyId: m.company_id, locationId: m.location_id, generation: m.generation };
  }

  async #decryptChecked(m: Meta, row: Record<string, unknown>): Promise<core.Credential> {
    const meta = row.meta as Meta;
    if (meta.id !== m.id || meta.generation !== m.generation || meta.mode !== m.mode) throw new LifecycleError('stale_generation');
    const pt = await open(this.#d.keyring, this.#activeBinding(m, m.generation), row.envelope, row.key_id);
    let c: core.Credential;
    try { c = JSON.parse(pt); } catch { throw new LifecycleError('credential_integrity'); }
    if (!c || c.mode !== m.mode || c.companyId !== m.company_id || c.locationId !== m.location_id ||
        c.expiresAt !== meta.expires_at_ms || (c.refreshToken !== null) !== meta.refreshable) {
      throw new LifecycleError('credential_integrity');
    }
    return c;
  }

  async #leaseFromActive(m: Meta): Promise<TokenLease> {
    const row = await this.#call('ghl_lc_read_active', { credential_id: m.id });
    if (row.status !== 'ok') throw new LifecycleError(row.status === 'unknown_mode' ? 'unknown_mode' : 'recovery_required');
    const c = await this.#decryptChecked(m, row);
    return { accessToken: new ServerInternalAccessToken(c.accessToken), expiresAtMs: c.expiresAt, generation: m.generation, mode: c.mode };
  }

  async #readClaimed(m: Meta, opId: string): Promise<core.Credential> {
    const row = await this.#call('ghl_lc_read_claimed', { op_id: opId, owner: this.#d.workerId, credential_id: m.id });
    if (row.status !== 'ok') throw new LifecycleError('claim_lost', opId);
    return await this.#decryptChecked(m, row);
  }

  #invokeCore(kind: 'refresh' | 'exchange', deps: core.CoreDeps, target: Meta, tCred: core.Credential, pCred: core.Credential | null): Promise<core.Credential> {
    if (kind === 'refresh') {
      return core.refreshCredential(deps, { clientId: this.#d.config.clientId, clientSecret: this.#d.config.clientSecret }, tCred);
    }
    return core.exchangeCompanyForLocation(deps, pCred as core.Credential, { companyId: target.company_id, locationId: target.location_id as string });
  }

  async #runOp(kind: 'refresh' | 'exchange', target: Meta, parent: Meta | null): Promise<OpResult> {
    const d = this.#d;
    const opId = d.newId!();
    const c = await this.#call('ghl_lc_claim', { op_id: opId, kind, owner: d.workerId, target_credential_id: target.id,
      parent_credential_id: parent?.id ?? null, expected_generation: target.generation,
      parent_generation: parent?.generation ?? null, lease_ms: d.config.leaseMs });
    if (c.status === 'busy') { this.#log('claim', 'busy'); await d.sleep!(d.config.busyPollDelayMs); return { kind: 'retry' }; }
    if (c.status === 'stale_generation') { this.#log('claim', 'stale_generation'); return { kind: 'retry' }; }
    if (c.status === 'recovery_required' || c.status === 'unknown_mode') throw new LifecycleError(c.status as string);
    if (c.status !== 'claimed') throw new LifecycleError('claim_failed');
    this.#log('claim', 'claimed', opId);
    await this.#fault('afterClaim', opId);

    // Reread under authority. Generation is fixed by the claim; a mismatch means we must not proceed.
    let tCred: core.Credential, pCred: core.Credential | null = null;
    try {
      tCred = await this.#readClaimed(target, opId);
      if (parent) pCred = await this.#readClaimed(parent, opId);
    } catch (e) {
      if (e instanceof SimulatedCrash) throw e;
      await this.#finish(opId, 'not_dispatched', this.#codeOf(e));
      throw e;
    }

    const ctx: { state: string; receivedAt?: number; status?: number; crashed?: SimulatedCrash; calls: number } = { state: 'pre', calls: 0 };
    const capturing: core.Transport = async (req) => {
      if (ctx.calls++ > 0) { ctx.state = 'second_dispatch'; throw new Error('x'); }
      let auth: Record<string, unknown>;
      try { auth = await this.#call('ghl_lc_authorize_dispatch', { op_id: opId, owner: d.workerId }); }
      catch { ctx.state = 'authorize_unknown'; throw new Error('x'); }
      if (auth.status !== 'ok') { ctx.state = 'lost'; throw new Error('x'); }
      try { await this.#fault('afterAuthorize', opId); } catch (e) { ctx.crashed = e as SimulatedCrash; throw e; }
      ctx.state = 'dispatched';
      let res: core.HttpResponse;
      try { res = await d.transport(req); } catch { ctx.state = 'transport_failed'; throw new Error('x'); }
      const receivedAt = this.#now();
      if (!res || typeof res !== 'object' || !Number.isInteger(res.status)) { ctx.state = 'bad_response'; throw new Error('x'); }
      if (res.status < 200 || res.status >= 300) {
        ctx.state = 'provider_rejected'; ctx.status = res.status;
        return { status: res.status, url: res.url, redirected: res.redirected, headers: {}, bodyText: '' };
      }
      if (typeof res.bodyText !== 'string' || new TextEncoder().encode(res.bodyText).length > MAX_CAPTURE_BODY) {
        ctx.state = 'oversized_response'; throw new Error('x'); // cannot be sealed: durable uncertainty, no fragments kept
      }
      try {
        const sealed = await seal(d.keyring, this.#captureBinding(target, opId),
          JSON.stringify({ status: res.status, url: res.url, redirected: res.redirected, bodyText: res.bodyText }));
        const cap = await this.#call('ghl_lc_capture', { op_id: opId, owner: d.workerId, envelope: sealed.envelope,
          key_id: sealed.keyId, received_at_ms: receivedAt, provider_status: res.status });
        if (cap.status !== 'ok') throw new Error('x');
      } catch { ctx.state = 'capture_failed'; throw new Error('x'); }
      ctx.state = 'captured'; ctx.receivedAt = receivedAt;
      try { await this.#fault('afterCapture', opId); } catch (e) { ctx.crashed = e as SimulatedCrash; throw e; }
      return { status: res.status, url: res.url, redirected: res.redirected, headers: {}, bodyText: res.bodyText };
    };

    let out: core.Credential | undefined; let err: unknown;
    try {
      out = await this.#invokeCore(kind, { transport: capturing, now: () => ctx.receivedAt ?? this.#now() }, target, tCred, pCred);
    } catch (e) { err = e; }
    if (ctx.crashed) throw ctx.crashed;

    switch (ctx.state) {
      case 'pre': { // core refused before any dispatch
        const code = this.#codeOf(err);
        await this.#finish(opId, 'not_dispatched', code);
        throw new LifecycleError(code, opId);
      }
      case 'lost': throw new LifecycleError('claim_lost', opId);
      case 'authorize_unknown': throw new LifecycleError('storage_failed', opId);
      case 'provider_rejected':
        await this.#finish(opId, 'provider_rejected', 'provider_error', ctx.status);
        throw new LifecycleError('provider_error', opId, ctx.status);
      case 'captured':
        if (err !== undefined) {
          const code = this.#codeOf(err);
          await this.#finish(opId, 'validation_rejected', code); // candidate stays sealed/quarantined
          throw new LifecycleError(code, opId);
        }
        return { kind: 'done', ...(await this.#publish(opId, target, out!)) };
      default: // transport_failed, bad_response, oversized_response, capture_failed, second_dispatch
        await this.#finish(opId, 'uncertain', ctx.state);
        throw new LifecycleError('recovery_required', opId);
    }
  }

  async #publish(opId: string, target: Meta, out: core.Credential): Promise<{ cred: core.Credential; generation: number }> {
    await this.#fault('beforeCommit', opId);
    const gen = target.generation + 1;
    let r: Record<string, unknown>;
    try {
      const sealed = await seal(this.#d.keyring, this.#activeBinding(target, gen), JSON.stringify(out));
      r = await this.#d.store.call('ghl_lc_commit', { op_id: opId, owner: this.#d.workerId, envelope: sealed.envelope,
        key_id: sealed.keyId, expires_at_ms: out.expiresAt, refreshable: out.refreshToken !== null, scopes: out.scopes });
    } catch (e) {
      if (e instanceof SimulatedCrash) throw e;
      this.#log('commit', 'commit_failed', opId);
      throw new LifecycleError('commit_pending_recovery', opId);
    }
    if (r.status !== 'committed' && r.status !== 'already_committed') throw new LifecycleError('commit_rejected', opId);
    this.#log('commit', 'committed', opId);
    await this.#fault('afterCommit', opId);
    return { cred: out, generation: Number(r.generation) };
  }

  async #finish(opId: string, outcome: string, code: string, status?: number) {
    try {
      await this.#d.store.call('ghl_lc_finish', { op_id: opId, owner: this.#d.workerId, outcome,
        error_code: CODE_RE.test(code) ? code : 'internal_error', provider_status: status ?? null });
    } catch { this.#log('finish', 'finish_failed', opId); } // op row stays in its blocking phase
    this.#log('finish', outcome, opId);
  }

  async #call(fn: Parameters<LcStore['call']>[0], args: Record<string, unknown>) {
    return await this.#d.store.call(fn, args);
  }
  async #fault(p: FaultPoint, opId: string) { const f = this.#d.faults?.[p]; if (f) await f(opId); }
  #codeOf(e: unknown): string {
    if (e instanceof core.CoreError || e instanceof LifecycleError || e instanceof EnvelopeError || e instanceof StoreError) {
      return CODE_RE.test(e.code) ? e.code : 'internal_error';
    }
    return 'internal_error';
  }
  #log(event: string, code: string, opId?: string) { try { this.#d.log!({ event, code, opId }); } catch { /* sink must not break flow */ } }

  async #guard<T>(fn: () => Promise<T>): Promise<T> {
    try { return await fn(); } catch (e) {
      if (e instanceof SimulatedCrash) throw e;
      const err = e instanceof LifecycleError ? e : new LifecycleError(e instanceof StoreError ? 'storage_failed' : this.#codeOf(e));
      this.#log('error', err.code, err.opId);
      throw err;
    }
  }
}
````

### lc-test-helpers.ts
`sha256 f80826268e012d2ab971f297d0bb711ec9a6d44b082266459fe9c17d101b000f`

````ts
// Scratch-only test harness: disposable local PostgreSQL (Unix socket, no TCP), fabricated data, synthetic provider.
import * as core from './token-core.ts';
import { importAesKey, type Keyring, seal } from './lc-crypto.ts';
import { type LcStore, PgPsqlStore, psql, type Rpc } from './lc-pg-store.ts';
import { type AuthorityGrant, LifecycleManager, type LogEvent, type ManagerDeps } from './lc-manager.ts';

export const PG = { socketDir: '/tmp/lcpg', port: 55432, database: 'lctest' };
export const SUPER = { ...PG, role: 'lc_super' };
export const T0 = Date.UTC(2026, 9, 15, 12, 0, 0);
export const CLIENT_SECRET = 'cs-CANARY-SECRET-0000';
export const RAW_KEY = new Uint8Array(32).map((_, i) => (i * 7 + 3) & 0xff);
export const RAW_KEY2 = new Uint8Array(32).map((_, i) => (i * 11 + 5) & 0xff);
export const KEY_CANARIES = [btoa(String.fromCharCode(...RAW_KEY)), [...RAW_KEY].map((b) => b.toString(16).padStart(2, '0')).join('')];

export async function sql(q: string, role = 'lc_super', db = PG.database) {
  return await psql({ ...PG, database: db, role }, q);
}
export async function sqlOk(q: string, role = 'lc_super') {
  const r = await sql(q, role); if (r.code !== 0) throw new Error('sql failed: ' + r.stderr.slice(0, 300)); return r.stdout.trim();
}

let schemaReady = false;
export async function resetDb() {
  if (!schemaReady) {
    await psql({ ...PG, database: 'postgres', role: 'lc_super' }, `drop database if exists lctest with (force);`);
    const c = await psql({ ...PG, database: 'postgres', role: 'lc_super' }, `create database lctest;`);
    if (c.code !== 0) throw new Error(c.stderr);
    const roles = await psql({ ...PG, database: 'postgres', role: 'lc_super' }, `select count(*) from pg_roles where rolname in ('anon','authenticated','service_role');`);
    const boot = Deno.readTextFileSync(new URL('./lc-test-bootstrap.sql', import.meta.url));
    const rolesBoot = roles.stdout.trim() === '3' ? boot.split('\n').filter((l) => !l.startsWith('create role')).join('\n') : boot;
    const b = await sql(rolesBoot); if (b.code !== 0) throw new Error(b.stderr);
    const s = await sql(Deno.readTextFileSync(new URL('./lc-schema.sql', import.meta.url)));
    if (s.code !== 0) throw new Error(s.stderr);
    schemaReady = true;
  }
  await sqlOk('truncate public.ghl_lc_ops, public.ghl_lc_bindings, public.ghl_lc_credentials cascade;');
}

export async function keyring(): Promise<Keyring> {
  return { activeKeyId: 'k1', keys: new Map([['k1', await importAesKey(RAW_KEY)]]) };
}

/** Counting/fault-injecting wrapper around the real PostgreSQL store. */
export class SpyStore implements LcStore {
  calls: Rpc[] = [];
  failOnce = new Set<Rpc>();
  before?: (fn: Rpc, args: Record<string, unknown>) => Promise<void>;
  constructor(public inner: LcStore = new PgPsqlStore({ ...PG, role: 'service_role' })) {}
  async call(fn: Rpc, args: Record<string, unknown>) {
    this.calls.push(fn);
    if (this.before) await this.before(fn, args);
    if (this.failOnce.has(fn)) { this.failOnce.delete(fn); throw new (await import('./lc-pg-store.ts')).StoreError('storage_failed'); }
    return await this.inner.call(fn, args);
  }
  count(fn: Rpc) { return this.calls.filter((c) => c === fn).length; }
}

// ---------------- synthetic HighLevel ----------------
interface Issued { kind: 'Company' | 'Location'; companyId: string; locationId: string | null; issuance: number; spent: boolean; via: 'native' | 'exchange' }
export class FakeGhl {
  n = 0;
  refreshCalls = 0; exchangeCalls = 0; spentReuse = 0;
  inflight = 0; maxInflight = 0; inflightExchange = 0; maxInflightExchange = 0;
  refreshTokens = new Map<string, Issued>();
  accessTokens = new Map<string, Issued>();
  requests: core.HttpRequest[] = [];
  gate: Promise<void> | null = null;
  mutate?: (body: Record<string, unknown>, req: core.HttpRequest) => Record<string, unknown> | string;
  status = 200;
  throwAfterRotate = false;
  exchangeRefreshable = false;

  issue(kind: 'Company' | 'Location', companyId: string, locationId: string | null, via: 'native' | 'exchange', withRt = true) {
    const i = ++this.n;
    const at = `at-${i}-CANARY`, rt = withRt ? `rt-${i}-CANARY` : null;
    const rec: Issued = { kind, companyId, locationId, issuance: i, spent: false, via };
    this.accessTokens.set(at, rec); if (rt) this.refreshTokens.set(rt, rec);
    return { at, rt, rec };
  }
  credential(mode: core.Mode, companyId: string, locationId: string | null, expiresAt: number, scopes = ['contacts.readonly'], withRt = true): core.Credential {
    const kind = mode === 'company_parent' ? 'Company' : 'Location';
    const { at, rt } = this.issue(kind, companyId, locationId, mode === 'derived_location' ? 'exchange' : 'native', withRt);
    return { mode, accessToken: at, refreshToken: rt, expiresAt, scopes, companyId, locationId };
  }
  transport: core.Transport = async (req) => {
    this.requests.push(req);
    this.inflight++; this.maxInflight = Math.max(this.maxInflight, this.inflight);
    const isEx = req.url.endsWith(core.LOCATION_TOKEN_PATH);
    if (isEx) { this.inflightExchange++; this.maxInflightExchange = Math.max(this.maxInflightExchange, this.inflightExchange); }
    try {
      if (this.gate) await this.gate;
      const p = new URLSearchParams(req.body);
      let body: Record<string, unknown>;
      if (isEx) {
        this.exchangeCalls++;
        const parent = this.accessTokens.get((req.headers.Authorization ?? '').replace('Bearer ', ''));
        if (!parent || parent.kind !== 'Company') return this.res(req, 401, { error: 'unauthorized' });
        const { at, rt } = this.issue('Location', p.get('companyId')!, p.get('locationId')!, 'exchange', this.exchangeRefreshable);
        body = { access_token: at, token_type: 'Bearer', expires_in: 86400, scope: 'contacts.readonly',
          companyId: p.get('companyId'), locationId: p.get('locationId'), ...(rt ? { refresh_token: rt } : {}) };
      } else {
        this.refreshCalls++;
        const old = this.refreshTokens.get(p.get('refresh_token') ?? '');
        if (!old) return this.res(req, 400, { error: 'invalid_grant' });
        if (old.spent) { this.spentReuse++; return this.res(req, 400, { error: 'invalid_grant' }); }
        old.spent = true;
        const { at, rt } = this.issue(old.kind, old.companyId, old.locationId, old.via);
        body = { access_token: at, refresh_token: rt, token_type: 'Bearer', expires_in: 86400,
          scope: old.kind === 'Company' ? 'oauth.write oauth.readonly' : 'contacts.readonly',
          userType: old.kind, companyId: old.companyId, ...(old.locationId ? { locationId: old.locationId } : {}) };
        if (this.throwAfterRotate) throw new Error('socket hang up');
      }
      if (this.status !== 200) return this.res(req, this.status, { error: 'invalid_grant' });
      const m = this.mutate ? this.mutate(body, req) : body;
      return { status: 200, url: req.url, redirected: false, headers: {}, bodyText: typeof m === 'string' ? m : JSON.stringify(m) };
    } finally { this.inflight--; if (isEx) this.inflightExchange--; }
  };
  res(req: core.HttpRequest, status: number, b: unknown): core.HttpResponse {
    return { status, url: req.url, redirected: false, headers: {}, bodyText: JSON.stringify(b) };
  }
}

export function deferred() { let resolve!: () => void; const p = new Promise<void>((r) => (resolve = r)); return { p, resolve }; }

// ---------------- fixtures ----------------
export const COMPANY = 'CompanyAAA111';
export const LOC_A = 'LocationAAA1', LOC_B = 'LocationBBB2';
export const OWNER = '11111111-1111-4111-8111-111111111111';
export const OTHER = '22222222-2222-4222-8222-222222222222';

export async function insertCredential(kr: Keyring, id: string, cred: core.Credential | null, opts: { mode?: string; parent?: string; owner?: string; grant?: string } = {}) {
  const owner = opts.owner ?? OWNER;
  const mode = opts.mode ?? cred!.mode;
  let envelope: string | null = null, keyId: string | null = null;
  if (cred) {
    const s = await seal(kr, { purpose: 'active_pair', credentialId: id, operationId: null, ownerUserId: owner,
      companyId: cred.companyId, locationId: cred.locationId, generation: 1 }, JSON.stringify(cred));
    envelope = s.envelope; keyId = s.keyId;
  }
  const r = await new PgPsqlStore({ ...PG, role: 'service_role' }).call('ghl_lc_insert_credential', {
    id, mode, issuer: 'ghl', app_id: 'app1', grant_id: opts.grant ?? `grant-${id}`, owner_user_id: owner,
    company_id: cred?.companyId ?? COMPANY, location_id: cred ? cred.locationId : LOC_A, parent_credential_id: opts.parent ?? null,
    envelope, key_id: keyId, expires_at_ms: cred?.expiresAt ?? null, refreshable: cred ? cred.refreshToken !== null : null,
    scopes: cred?.scopes ?? [] });
  if (r.status !== 'ok') throw new Error('seed failed ' + r.status);
}
export async function insertBinding(installationId: string, credentialId: string, locationId: string, owner = OWNER) {
  const r = await new PgPsqlStore({ ...PG, role: 'service_role' }).call('ghl_lc_insert_binding', {
    id: crypto.randomUUID(), installation_id: installationId, owner_user_id: owner, company_id: COMPANY, location_id: locationId, credential_id: credentialId });
  if (r.status !== 'ok') throw new Error('binding failed ' + r.status);
}

/** Trusted resolver model: maps an opaque server-verified session handle to a grant. Body fields are ignored. */
export function sessionResolver(sessions: Map<string, AuthorityGrant>) {
  return async (caller: unknown) => {
    const h = (caller as { verifiedSessionHandle?: unknown })?.verifiedSessionHandle;
    return typeof h === 'string' ? sessions.get(h) ?? null : null;
  };
}

export interface Rig { m: LifecycleManager; store: SpyStore; logs: LogEvent[]; clock: { t: number } }
export async function rig(fake: FakeGhl, sessions: Map<string, AuthorityGrant>, over: Partial<ManagerDeps> = {}, clock = { t: T0 }): Promise<Rig> {
  const store = (over.store as SpyStore) ?? new SpyStore();
  const logs: LogEvent[] = [];
  const m = new LifecycleManager({
    store, keyring: await keyring(), transport: fake.transport, now: () => clock.t,
    config: { clientId: 'client-1', clientSecret: CLIENT_SECRET, expirySkewMs: 60_000, leaseMs: 150, busyPollAttempts: 15, busyPollDelayMs: 60 },
    resolveAuthority: sessionResolver(sessions), workerId: `w-${crypto.randomUUID().slice(0, 8)}`,
    log: (e) => logs.push(e), ...over, ...(over.store ? {} : { store }),
  });
  return { m, store, logs, clock };
}

export async function dumpAllRows(): Promise<string> {
  return await sqlOk(`select coalesce(json_agg(t),'[]') from (select row_to_json(c) t from public.ghl_lc_credentials c
    union all select row_to_json(o) from public.ghl_lc_ops o union all select row_to_json(b) from public.ghl_lc_bindings b) x;`);
}
export async function opRow(opId: string) {
  return JSON.parse(await sqlOk(`select row_to_json(o) from public.ghl_lc_ops o where id = '${opId}'`));
}
export async function credRow(id: string) {
  return JSON.parse(await sqlOk(`select row_to_json(c) from public.ghl_lc_credentials c where id = '${id}'`));
}
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
````

### lc-crypto.test.ts
`sha256 543a5e17579c58d70d9943b2e49bf011dfeb6182ce1078d5020719e7e3c57493`

````ts
import { assert, assertEquals, assertNotEquals, assertRejects } from 'jsr:@std/assert@1';
import { type EnvelopeBinding, EnvelopeError, importAesKey, open, seal } from './lc-crypto.ts';

const raw = (s: number) => new Uint8Array(32).map((_, i) => (i * s + 1) & 0xff);
const kr = async (id = 'k1', s = 3) => ({ activeKeyId: id, keys: new Map([[id, await importAesKey(raw(s))]]) });
const B: EnvelopeBinding = { purpose: 'active_pair', credentialId: 'c1', operationId: null, ownerUserId: 'u1', companyId: 'co', locationId: 'lo', generation: 1 };
const code = async (p: Promise<unknown>) => { try { await p; return 'none'; } catch (e) { return (e as EnvelopeError).code; } };

Deno.test('crypto: AES-GCM roundtrip', async () => {
  const k = await kr();
  const s = await seal(k, B, 'secret-CANARY');
  assertEquals(await open(k, B, s.envelope, s.keyId), 'secret-CANARY');
  assert(!s.envelope.includes('CANARY'));
});
Deno.test('crypto: fresh nonce and different ciphertext per write', async () => {
  const k = await kr();
  const a = (await seal(k, B, 'same')).envelope.split('.'), b = (await seal(k, B, 'same')).envelope.split('.');
  assertNotEquals(a[2], b[2]); assertNotEquals(a[3], b[3]);
});
Deno.test('crypto: tampered ciphertext / nonce rejected', async () => {
  const k = await kr();
  const s = await seal(k, B, 'x'); const p = s.envelope.split('.');
  const flip = (t: string) => (t[5] === 'A' ? 'B' : 'A');
  const ct = [...p]; ct[3] = ct[3].slice(0, 5) + flip(ct[3]) + ct[3].slice(6);
  const iv = [...p]; iv[2] = iv[2].slice(0, 5) + flip(iv[2]) + iv[2].slice(6);
  assertEquals(await code(open(k, B, ct.join('.'), 'k1')), 'envelope_auth_failed');
  assertEquals(await code(open(k, B, iv.join('.'), 'k1')), 'envelope_auth_failed');
});
Deno.test('crypto: wrong key (same id) and unknown key id rejected', async () => {
  const s = await seal(await kr(), B, 'x');
  assertEquals(await code(open(await kr('k1', 5), B, s.envelope, 'k1')), 'envelope_auth_failed');
  assertEquals(await code(open(await kr('k2'), B, s.envelope.replace('.k1.', '.k2.'), 'k2')), 'envelope_auth_failed');
  assertEquals(await code(open(await kr('k2'), B, s.envelope, 'k1')), 'unknown_key');
});
Deno.test('crypto: every binding field is authenticated (swap fails)', async () => {
  const k = await kr();
  const s = await seal(k, B, 'x');
  const variants: Partial<EnvelopeBinding>[] = [{ credentialId: 'c2' }, { ownerUserId: 'u2' }, { companyId: 'co2' },
    { locationId: 'lo2' }, { locationId: null }, { generation: 2 }, { purpose: 'capture', operationId: 'op1' }];
  for (const v of variants) assertEquals(await code(open(k, { ...B, ...v }, s.envelope, 'k1')), 'envelope_auth_failed', JSON.stringify(v));
});
Deno.test('crypto: version, malformed, size and keyring validation', async () => {
  const k = await kr();
  const s = await seal(k, B, 'x');
  assertEquals(await code(open(k, B, s.envelope.replace('ghlenv1', 'ghlenv2'), 'k1')), 'envelope_version');
  assertEquals(await code(open(k, B, 'ghlenv1.k1.!!.??', 'k1')), 'envelope_malformed');
  assertEquals(await code(open(k, B, 42, 'k1')), 'envelope_malformed');
  assertEquals(await code(seal(k, B, '')), 'plaintext_size');
  assertEquals(await code(seal(k, B, 'a'.repeat(96 * 1024 + 1))), 'plaintext_size');
  const ext = await crypto.subtle.importKey('raw', raw(3), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  assertEquals(await code(seal({ activeKeyId: 'k1', keys: new Map([['k1', ext]]) }, B, 'x')), 'invalid_keyring');
  assertEquals(await code(seal(k, { ...B, operationId: 'x' }, 'x')), 'invalid_binding');
  await assertRejects(() => importAesKey(new Uint8Array(16)));
});
````

### lc-sql.test.ts
`sha256 896e9d726b3382723c54cb8d9f05eb78444a0f3aeeee85d4c4400dcaee996125`

````ts
// Real PostgreSQL 17 (disposable, socket-only). Grants, function hardening, atomic claim races, lock ordering.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { FakeGhl, insertCredential, keyring, resetDb, sql, sqlOk, T0, COMPANY, LOC_A, LOC_B } from './lc-test-helpers.ts';
import { PgPsqlStore } from './lc-pg-store.ts';

const T = ['ghl_lc_credentials', 'ghl_lc_bindings', 'ghl_lc_ops'];
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

Deno.test('sql: anon and authenticated cannot read/write any table', async () => {
  await resetDb();
  for (const role of ['anon', 'authenticated']) {
    for (const t of T) {
      const r = await sql(`select count(*) from public.${t};`, role);
      assert(r.code !== 0 && /permission denied/.test(r.stderr), `${role} select ${t}`);
      const w = await sql(`delete from public.${t};`, role);
      assert(w.code !== 0 && /permission denied/.test(w.stderr), `${role} delete ${t}`);
    }
  }
});
Deno.test('sql: anon/authenticated/PUBLIC cannot execute any ghl_lc function; service_role can', async () => {
  await resetDb();
  const fns = (await sqlOk(`select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'ghl\\_lc\\_%' order by 1;`)).split('\n');
  assert(fns.length >= 15, 'function count');
  for (const f of fns) {
    for (const role of ['anon', 'authenticated']) {
      assertEquals(await sqlOk(`select has_function_privilege('${role}', '${f}', 'execute');`), 'f', `${role} ${f}`);
    }
    assertEquals(await sqlOk(`select has_function_privilege('service_role', '${f}', 'execute');`), 't', f);
  }
  const r = await sql(`select public.ghl_lc_get_op('{}'::jsonb);`, 'anon');
  assert(r.code !== 0 && /permission denied/.test(r.stderr));
  // PUBLIC has no EXECUTE either
  assertEquals(await sqlOk(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace,
    aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where n.nspname='public' and p.proname like 'ghl\\_lc\\_%' and a.grantee = 0;`), '0');
});
Deno.test('sql: no SECURITY DEFINER; every function pins search_path to empty', async () => {
  await resetDb();
  const rows = (await sqlOk(`select proname || ':' || prosecdef || ':' || coalesce(array_to_string(proconfig, ','), '') from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ghl\\_lc\\_%';`)).split('\n');
  for (const r of rows) { const [, def, cfg] = r.split(':'); assertEquals(def, 'false', r); assertEquals(cfg, 'search_path=""', r); }
});
Deno.test('sql: RLS enabled, no policies, anon role has no bypass', async () => {
  await resetDb();
  assertEquals(await sqlOk(`select count(*) from pg_class where relname = any(array['${T.join("','")}']) and relrowsecurity;`), '3');
  assertEquals(await sqlOk(`select count(*) from pg_policies where tablename like 'ghl_lc_%';`), '0');
});

async function seedNative(n: number, loc = LOC_A) {
  const kr = await keyring(); const f = new FakeGhl();
  await insertCredential(kr, ID(n), f.credential('native_location', COMPANY, loc, T0 - 1000));
}
const claimSql = (op: string, target: string, parent: string | null, pg: number | null) =>
  `select public.ghl_lc_claim('${JSON.stringify({ op_id: op, kind: parent ? 'exchange' : 'refresh', owner: 'w', target_credential_id: target,
    parent_credential_id: parent, expected_generation: 1, parent_generation: pg, lease_ms: 60000 })}'::jsonb)->>'status';`;

Deno.test('sql race: 24 concurrent sessions claim one credential -> exactly one claimed', async () => {
  await resetDb(); await seedNative(1);
  const res = await Promise.all(Array.from({ length: 24 }, () => sql(claimSql(crypto.randomUUID(), ID(1), null, null), 'service_role')));
  const st = res.map((r) => r.stdout.trim());
  assertEquals(st.filter((s) => s === 'claimed').length, 1, st.join(','));
  assertEquals(st.filter((s) => s === 'busy').length, 23);
  assertEquals(await sqlOk(`select count(*) from public.ghl_lc_ops`), '1');
});
Deno.test('sql race: parent shared by two children; mixed refresh/exchange claims never deadlock and never co-own the parent', async () => {
  await resetDb();
  const kr = await keyring(); const f = new FakeGhl();
  // ids chosen so the parent sorts BETWEEN the children: any input order must still lock ascending
  await insertCredential(kr, ID(5), f.credential('company_parent', COMPANY, null, T0 - 1000, ['oauth.write']));
  await insertCredential(kr, ID(3), f.credential('derived_location', COMPANY, LOC_A, T0 - 1000, ['x'], false), { parent: ID(5) });
  await insertCredential(kr, ID(9), f.credential('derived_location', COMPANY, LOC_B, T0 - 1000, ['x'], false), { parent: ID(5) });
  for (let round = 0; round < 6; round++) {
    await sqlOk(`update public.ghl_lc_credentials set claim_op = null, claim_until = null; delete from public.ghl_lc_ops;`);
    const jobs = [claimSql(crypto.randomUUID(), ID(3), ID(5), 1), claimSql(crypto.randomUUID(), ID(9), ID(5), 1),
      claimSql(crypto.randomUUID(), ID(5), null, null), claimSql(crypto.randomUUID(), ID(9), ID(5), 1),
      claimSql(crypto.randomUUID(), ID(3), ID(5), 1), claimSql(crypto.randomUUID(), ID(5), null, null)];
    const res = await Promise.all(jobs.map((q) => sql(q, 'service_role')));
    for (const r of res) assert(r.code === 0 && !/deadlock/.test(r.stderr), r.stderr);
    const st = res.map((r) => r.stdout.trim());
    assertEquals(st.filter((s) => s === 'claimed').length, 1, st.join(',')); // every job touches the parent
    assertEquals(await sqlOk(`select count(distinct claim_op) from public.ghl_lc_credentials where claim_op is not null and id = '${ID(5)}'`), '1');
  }
  const log = Deno.readTextFileSync('/tmp/lcpg/pg.log');
  assert(!/deadlock detected/.test(log));
});
Deno.test('sql: different credentials claim independently in parallel', async () => {
  await resetDb(); await seedNative(1); await seedNative(2, LOC_B);
  const res = await Promise.all([sql(claimSql(crypto.randomUUID(), ID(1), null, null), 'service_role'), sql(claimSql(crypto.randomUUID(), ID(2), null, null), 'service_role')]);
  assertEquals(res.map((r) => r.stdout.trim()), ['claimed', 'claimed']);
});
Deno.test('sql: expired pre-dispatch claim is abandoned; expired post-dispatch claim is never taken over', async () => {
  await resetDb(); await seedNative(1);
  const s = new PgPsqlStore({ socketDir: '/tmp/lcpg', port: 55432, database: 'lctest', role: 'service_role' });
  const a = crypto.randomUUID();
  const args = (op: string) => ({ op_id: op, kind: 'refresh', owner: 'w', target_credential_id: ID(1), parent_credential_id: null, expected_generation: 1, parent_generation: null, lease_ms: 400 });
  assertEquals((await s.call('ghl_lc_claim', args(a))).status, 'claimed');
  await new Promise((r) => setTimeout(r, 500));
  const b = crypto.randomUUID();
  assertEquals((await s.call('ghl_lc_claim', args(b))).status, 'claimed');
  assertEquals(await sqlOk(`select phase from public.ghl_lc_ops where id='${a}'`), 'abandoned');
  assertEquals((await s.call('ghl_lc_authorize_dispatch', { op_id: a, owner: 'w' })).status, 'lost'); // stale worker cannot send
  assertEquals((await s.call('ghl_lc_authorize_dispatch', { op_id: b, owner: 'w' })).status, 'ok');
  await new Promise((r) => setTimeout(r, 500));
  assertEquals((await s.call('ghl_lc_claim', args(crypto.randomUUID()))).status, 'recovery_required');
});
Deno.test('sql: check constraints reject mixed mode shapes and companyId-only identity merge', async () => {
  await resetDb();
  const bad = [
    `insert into public.ghl_lc_credentials (id,mode,issuer,app_id,grant_id,owner_user_id,company_id,location_id,generation,envelope,key_id,expires_at,refreshable) values ('${ID(1)}','company_parent','ghl','a','g1','${ID(7)}','C1','L1',1,'e','k1',now(),true)`,
    `insert into public.ghl_lc_credentials (id,mode,issuer,app_id,grant_id,owner_user_id,company_id,location_id,generation,envelope,key_id,expires_at,refreshable) values ('${ID(1)}','derived_location','ghl','a','g1','${ID(7)}','C1','L1',1,'e','k1',now(),true)`,
    `insert into public.ghl_lc_credentials (id,mode,issuer,app_id,grant_id,owner_user_id,company_id,location_id,generation,envelope,key_id,expires_at,refreshable) values ('${ID(1)}','native_location','ghl','a','g1','${ID(7)}','C1','L1',1,null,null,null,null)`,
  ];
  for (const q of bad) assert((await sql(q + ';')).code !== 0, q);
  const ok = (id: number, grant: string) => `insert into public.ghl_lc_credentials (id,mode,issuer,app_id,grant_id,owner_user_id,company_id,location_id,generation,envelope,key_id,expires_at,refreshable) values ('${ID(id)}','native_location','ghl','a','${grant}','${ID(7)}','C1','L1',1,'e','k1',now(),true);`;
  assertEquals((await sql(ok(1, 'g1'))).code, 0);
  assertEquals((await sql(ok(2, 'g2'))).code, 0); // same company+location, distinct grant: separate rows, not merged
  assert((await sql(ok(3, 'g1'))).code !== 0); // same grant identity twice: rejected
});
````

### lc-manager.test.ts
`sha256 40c8d36a8bb3bd0b6ae4cc77b57667d7c87d731c0112a536793913f669d539b1`

````ts
// Manager tests against the REAL disposable PostgreSQL store (each RPC = separate psql session), real AES-GCM,
// the accepted core unchanged, and a synthetic in-process HighLevel (never the network).
import { assert, assertEquals, assertNotEquals } from 'jsr:@std/assert@1';
import * as core from './token-core.ts';
import { open } from './lc-crypto.ts';
import { LifecycleError, LifecycleManager, SimulatedCrash, type AuthorityGrant } from './lc-manager.ts';
import {
  CLIENT_SECRET, COMPANY, credRow, deferred, dumpAllRows, FakeGhl, insertBinding, insertCredential, KEY_CANARIES, keyring,
  LOC_A, LOC_B, opRow, OTHER, OWNER, PG, resetDb, rig, sleep, SpyStore, sqlOk, T0,
} from './lc-test-helpers.ts';

const NATIVE = 'aaaaaaaa-0000-4000-8000-000000000001';
const PARENT = 'aaaaaaaa-0000-4000-8000-000000000005';
const CHILD_A = 'aaaaaaaa-0000-4000-8000-000000000003';
const CHILD_B = 'aaaaaaaa-0000-4000-8000-000000000009';
const INST_A = 'bbbbbbbb-0000-4000-8000-00000000000a';
const INST_B = 'bbbbbbbb-0000-4000-8000-00000000000b';
const USE_A = { verifiedSessionHandle: 'use-A' }, USE_B = { verifiedSessionHandle: 'use-B' }, REC_A = { verifiedSessionHandle: 'rec-A' };
const EXPIRED = T0 - 1000, VALID = T0 + 3_600_000;
const SEEN: string[] = []; // every serialized public result/error, scanned for canaries at the end

function sessions(): Map<string, AuthorityGrant> {
  return new Map([
    ['use-A', { installationId: INST_A, ownerUserId: OWNER, action: 'use' }],
    ['use-B', { installationId: INST_B, ownerUserId: OWNER, action: 'use' }],
    ['rec-A', { installationId: INST_A, ownerUserId: OWNER, action: 'recover' }],
  ]);
}
async function errCode(p: Promise<unknown>): Promise<string> {
  try { const v = await p; SEEN.push(JSON.stringify(v)); return 'ok'; } catch (e) {
    SEEN.push(JSON.stringify(e), String(e), Deno.inspect(e));
    if (e instanceof SimulatedCrash) return 'crash';
    return e instanceof LifecycleError ? e.code : 'non_lifecycle:' + (e as Error)?.name;
  }
}
async function errOf(p: Promise<unknown>): Promise<LifecycleError> {
  try { await p; } catch (e) { SEEN.push(JSON.stringify(e)); return e as LifecycleError; } throw new Error('expected failure');
}
async function activeCred(id: string): Promise<core.Credential> {
  const r = await credRow(id);
  const pt = await open(await keyring(), { purpose: 'active_pair', credentialId: id, operationId: null, ownerUserId: r.owner_user_id,
    companyId: r.company_id, locationId: r.location_id, generation: r.generation }, r.envelope, r.key_id);
  return JSON.parse(pt);
}
async function nativeWorld(expiresAt = EXPIRED) {
  await resetDb(); const fake = new FakeGhl(); const kr = await keyring();
  const seed = fake.credential('native_location', COMPANY, LOC_A, expiresAt);
  await insertCredential(kr, NATIVE, seed); await insertBinding(INST_A, NATIVE, LOC_A);
  return { fake, seed, s: sessions() };
}
async function derivedWorld(o: { parentExp?: number; childExp?: number; childRefreshable?: boolean; parentScopes?: string[] } = {}) {
  await resetDb(); const fake = new FakeGhl(); const kr = await keyring();
  const parent = fake.credential('company_parent', COMPANY, null, o.parentExp ?? VALID, o.parentScopes ?? ['oauth.write', 'oauth.readonly']);
  const a = fake.credential('derived_location', COMPANY, LOC_A, o.childExp ?? EXPIRED, ['contacts.readonly'], o.childRefreshable ?? false);
  const b = fake.credential('derived_location', COMPANY, LOC_B, o.childExp ?? EXPIRED, ['contacts.readonly'], o.childRefreshable ?? false);
  await insertCredential(kr, PARENT, parent);
  await insertCredential(kr, CHILD_A, a, { parent: PARENT }); await insertCredential(kr, CHILD_B, b, { parent: PARENT });
  await insertBinding(INST_A, CHILD_A, LOC_A); await insertBinding(INST_B, CHILD_B, LOC_B);
  return { fake, parent, a, b, s: sessions() };
}
const LONG = { config: { clientId: 'client-1', clientSecret: CLIENT_SECRET, expirySkewMs: 60_000, leaseMs: 10_000, busyPollAttempts: 20, busyPollDelayMs: 100 } };
const lastOp = async () => (await sqlOk(`select id from public.ghl_lc_ops order by created_at desc limit 1`));

// ---------------------------------------------------------------- happy paths
Deno.test('happy: valid native credential reused, zero provider calls', async () => {
  const { fake, seed, s } = await nativeWorld(VALID);
  const { m } = await rig(fake, s);
  const t = await m.getLocationAccessToken(USE_A);
  assertEquals(t.accessToken.reveal(), seed.accessToken); assertEquals(fake.requests.length, 0); assertEquals(t.generation, 1);
});
Deno.test('happy: expired native refreshed with ITS OWN refresh token; complete new pair committed', async () => {
  const { fake, seed, s } = await nativeWorld();
  const { m } = await rig(fake, s);
  const t = await m.getLocationAccessToken(USE_A);
  assertEquals(fake.refreshCalls, 1);
  const p = new URLSearchParams(fake.requests[0].body);
  assertEquals(p.get('refresh_token'), seed.refreshToken); assertEquals(p.get('user_type'), 'Location');
  const c = await activeCred(NATIVE);
  assertEquals(t.generation, 2); assertEquals(c.accessToken, t.accessToken.reveal());
  assertEquals(fake.accessTokens.get(c.accessToken)!.issuance, fake.refreshTokens.get(c.refreshToken!)!.issuance); // same issuance
  assertEquals(c.expiresAt, T0 + 86_400_000);
});
Deno.test('happy: refreshable derived child refreshed with ITS OWN token, never the parent token', async () => {
  const { fake, a, parent, s } = await derivedWorld({ childRefreshable: true });
  const { m } = await rig(fake, s);
  await m.getLocationAccessToken(USE_A);
  assertEquals(fake.refreshCalls, 1); assertEquals(fake.exchangeCalls, 0);
  const p = new URLSearchParams(fake.requests[0].body);
  assertEquals(p.get('refresh_token'), a.refreshToken); assertNotEquals(p.get('refresh_token'), parent.refreshToken);
  assertEquals((await activeCred(CHILD_A)).mode, 'derived_location');
  assertEquals((await credRow(PARENT)).generation, 1);
});
Deno.test('happy: access-only child re-derived from complete parent via exchange', async () => {
  const { fake, parent, s } = await derivedWorld();
  const { m } = await rig(fake, s);
  const t = await m.getLocationAccessToken(USE_A);
  assertEquals([fake.refreshCalls, fake.exchangeCalls], [0, 1]);
  assertEquals(fake.requests[0].headers.Authorization, `Bearer ${parent.accessToken}`);
  const c = await activeCred(CHILD_A);
  assertEquals(c.refreshToken, null); assertEquals(c.locationId, LOC_A); assertEquals(t.generation, 2);
  assertEquals((await activeCred(PARENT)).refreshToken, parent.refreshToken); // parent pair untouched
});
Deno.test('happy: expired parent refreshed first, then child derived with the NEW parent access token', async () => {
  const { fake, parent, s } = await derivedWorld({ parentExp: EXPIRED });
  const { m } = await rig(fake, s);
  await m.getLocationAccessToken(USE_A);
  assertEquals([fake.refreshCalls, fake.exchangeCalls], [1, 1]);
  assertEquals(new URLSearchParams(fake.requests[0].body).get('refresh_token'), parent.refreshToken);
  const np = await activeCred(PARENT);
  assertEquals(fake.requests[1].headers.Authorization, `Bearer ${np.accessToken}`);
  assertEquals((await credRow(PARENT)).generation, 2); assertEquals((await credRow(CHILD_A)).generation, 2);
  const child = await activeCred(CHILD_A);
  assert(child.refreshToken === null && child.accessToken !== np.accessToken); // never mixed
});

// ---------------------------------------------------------------- authority & config
Deno.test('authz: denied caller (body userId/locationId/verified:true/old proxy secret) -> zero store calls, zero provider calls', async () => {
  const { fake, s } = await nativeWorld();
  const { m, store } = await rig(fake, s);
  const forged = { userId: OWNER, locationId: LOC_A, installationId: INST_A, verified: true, 'x-ixty-proxy-secret': 'whatever' };
  assertEquals(await errCode(m.getLocationAccessToken(forged)), 'unauthorized');
  assertEquals(await errCode(m.getLocationAccessToken(REC_A)), 'unauthorized'); // recover grant cannot 'use'
  assertEquals(await errCode(m.recoverOperation(USE_A, crypto.randomUUID())), 'unauthorized');
  assertEquals(store.calls.length, 0); assertEquals(fake.requests.length, 0);
});
Deno.test('authz: resolver grant for a mismatched owner -> binding_mismatch with metadata read only, no secret read', async () => {
  const { fake } = await nativeWorld();
  const s = new Map([['use-A', { installationId: INST_A, ownerUserId: OTHER, action: 'use' as const }]]);
  const { m, store } = await rig(fake, s);
  assertEquals(await errCode(m.getLocationAccessToken(USE_A)), 'binding_mismatch');
  assertEquals(store.calls, ['ghl_lc_get_binding']); assertEquals(fake.requests.length, 0);
});
Deno.test('authz: resolver failure fails closed', async () => {
  const { fake, s } = await nativeWorld();
  const { m, store } = await rig(fake, s, { resolveAuthority: () => Promise.reject(new Error('jwks down')) });
  assertEquals(await errCode(m.getLocationAccessToken(USE_A)), 'authority_unavailable'); assertEquals(store.calls.length, 0);
});
Deno.test('authz: unknown legacy row is never treated as Location', async () => {
  await resetDb(); const fake = new FakeGhl(); const kr = await keyring();
  await insertCredential(kr, NATIVE, null, { mode: 'legacy_unknown' }); await insertBinding(INST_A, NATIVE, LOC_A);
  const { m, store } = await rig(fake, sessions());
  assertEquals(await errCode(m.getLocationAccessToken(USE_A)), 'unknown_mode');
  assertEquals(store.calls, ['ghl_lc_get_binding']); assertEquals(fake.requests.length, 0);
});
Deno.test('config: missing/invalid client config, skew, lease or keyring rejected before anything runs', async () => {
  const { fake, s } = await nativeWorld();
  const base = (await rig(fake, s)).m; void base;
  const kr = await keyring();
  const good = { clientId: 'c', clientSecret: 's', expirySkewMs: 0, leaseMs: 1000, busyPollAttempts: 0, busyPollDelayMs: 0 };
  const bad = [{ clientId: '' }, { clientSecret: ' s' }, { expirySkewMs: -1 }, { expirySkewMs: 1.5 }, { leaseMs: 10 }, { busyPollAttempts: 99 }];
  for (const b of bad) {
    let code = '';
    try { new LifecycleManager({ store: new SpyStore(), keyring: kr, transport: fake.transport, now: () => T0, config: { ...good, ...b } as never, resolveAuthority: async () => null, workerId: 'w' }); }
    catch (e) { code = (e as LifecycleError).code; }
    assertEquals(code, 'invalid_config', JSON.stringify(b));
  }
  let code = '';
  try { new LifecycleManager({ store: new SpyStore(), keyring: { activeKeyId: 'k9', keys: new Map() }, transport: fake.transport, now: () => T0, config: good, resolveAuthority: async () => null, workerId: 'w' }); }
  catch (e) { code = (e as LifecycleError).code; }
  assertEquals(code, 'invalid_config');
  const { m } = await rig(fake, s, { now: () => NaN });
  assertEquals(await errCode(m.getLocationAccessToken(USE_A)), 'invalid_clock'); assertEquals(fake.requests.length, 0);
});
Deno.test('preflight: exchange refused without oauth.write on the parent -> not_dispatched, zero provider calls', async () => {
  const { fake, s } = await derivedWorld({ parentScopes: ['oauth.readonly'] });
  const { m } = await rig(fake, s);
  assertEquals(await errCode(m.getLocationAccessToken(USE_A)), 'grant_missing');
  assertEquals(fake.requests.length, 0);
  assertEquals(await sqlOk(`select phase from public.ghl_lc_ops`), 'not_dispatched');
  assertEquals((await credRow(CHILD_A)).state, 'active');
});

// ---------------------------------------------------------------- concurrency
Deno.test('race: 5 independent managers on the SAME credential -> exactly one provider refresh', async () => {
  const { fake, s } = await nativeWorld();
  const gate = deferred(); fake.gate = gate.p;
  const ms = await Promise.all(Array.from({ length: 5 }, () => rig(fake, s, LONG)));
  const all = Promise.all(ms.map((r) => r.m.getLocationAccessToken(USE_A).then((t) => t.accessToken.reveal(), (e) => 'ERR:' + e.code)));
  await sleep(600); gate.resolve();
  const out = await all;
  assertEquals(fake.refreshCalls, 1); assertEquals(fake.spentReuse, 0);
  const winner = (await activeCred(NATIVE)).accessToken;
  for (const o of out) assert(o === winner || o === 'ERR:busy', o);
  assert(out.filter((o) => o === winner).length >= 1);
  assertEquals((await credRow(NATIVE)).generation, 2);
});
Deno.test('race: different credentials progress independently (both in flight together)', async () => {
  await resetDb(); const fake = new FakeGhl(); const kr = await keyring();
  await insertCredential(kr, CHILD_A, fake.credential('native_location', COMPANY, LOC_A, EXPIRED)); await insertBinding(INST_A, CHILD_A, LOC_A);
  await insertCredential(kr, CHILD_B, fake.credential('native_location', COMPANY, LOC_B, EXPIRED)); await insertBinding(INST_B, CHILD_B, LOC_B);
  const gate = deferred(); fake.gate = gate.p;
  const [r1, r2] = [await rig(fake, sessions(), LONG), await rig(fake, sessions(), LONG)];
  const p = Promise.all([r1.m.getLocationAccessToken(USE_A), r2.m.getLocationAccessToken(USE_B)]);
  await sleep(500); assertEquals(fake.maxInflight, 2); gate.resolve(); await p;
  assertEquals(fake.refreshCalls, 2);
});
Deno.test('race: two child installations sharing one parent serialize parent use (exchange never overlaps)', async () => {
  const { fake, s } = await derivedWorld();
  const gate = deferred(); fake.gate = gate.p;
  const [r1, r2] = [await rig(fake, s, LONG), await rig(fake, s, LONG)];
  const p = Promise.all([r1.m.getLocationAccessToken(USE_A), r2.m.getLocationAccessToken(USE_B)]);
  await sleep(500); assertEquals(fake.maxInflightExchange, 1); gate.resolve(); await p;
  assertEquals(fake.exchangeCalls, 2); assertEquals(fake.maxInflightExchange, 1);
  assertEquals((await credRow(CHILD_A)).generation, 2); assertEquals((await credRow(CHILD_B)).generation, 2);
});
Deno.test('race: parent rotation and child exchange on the same parent never overlap', async () => {
  const { fake, s } = await derivedWorld({ parentExp: EXPIRED });
  const gate = deferred(); fake.gate = gate.p;
  const [r1, r2] = [await rig(fake, s, LONG), await rig(fake, s, LONG)];
  const p = Promise.all([r1.m.getLocationAccessToken(USE_A), r2.m.getLocationAccessToken(USE_B)]);
  await sleep(500); assertEquals(fake.maxInflight, 1); gate.resolve(); await p;
  assertEquals(fake.refreshCalls, 1); assertEquals(fake.exchangeCalls, 2); assertEquals(fake.maxInflight, 1); assertEquals(fake.spentReuse, 0);
});
Deno.test('stale reader: worker holding generation-1 metadata never spends the old refresh token', async () => {
  const { fake, s } = await nativeWorld();
  const hold = deferred(); const released = deferred();
  const spy = new SpyStore();
  spy.before = async (fn) => { if (fn === 'ghl_lc_claim' && spy.count('ghl_lc_claim') === 1) { released.resolve(); await hold.p; } };
  const slow = await rig(fake, s, { store: spy });
  const fast = await rig(fake, s);
  const pSlow = slow.m.getLocationAccessToken(USE_A);
  await released.p; // slow has read gen-1 metadata and is about to claim
  const t = await fast.m.getLocationAccessToken(USE_A);
  hold.resolve();
  const t2 = await pSlow;
  assertEquals(fake.refreshCalls, 1); assertEquals(fake.spentReuse, 0);
  assertEquals(t2.accessToken.reveal(), t.accessToken.reveal()); assertEquals(t2.generation, 2);
});
Deno.test('stalled pre-dispatch worker loses its claim after lease expiry and never sends', async () => {
  const { fake, s } = await nativeWorld();
  const stall = deferred();
  const a = await rig(fake, s, { faults: { afterClaim: () => stall.p } });
  const pA = errCode(a.m.getLocationAccessToken(USE_A));
  await sleep(400); // A's 150ms lease expired while still pre-dispatch
  const b = await rig(fake, s);
  await b.m.getLocationAccessToken(USE_A);
  stall.resolve();
  assertEquals(await pA, 'claim_lost');
  assertEquals(fake.refreshCalls, 1); assertEquals(fake.spentReuse, 0);
  assertEquals(await sqlOk(`select string_agg(phase, ',' order by created_at) from public.ghl_lc_ops`), 'abandoned,committed');
});
Deno.test('expired lease while the old request is still pending: no takeover, no second spend; late response commits', async () => {
  const { fake, s } = await nativeWorld();
  const gate = deferred(); fake.gate = gate.p;
  const a = await rig(fake, s);
  const pA = a.m.getLocationAccessToken(USE_A);
  await sleep(400); // lease expired, request still in flight at the provider
  const b = await rig(fake, s);
  assertEquals(await errCode(b.m.getLocationAccessToken(USE_A)), 'recovery_required');
  assertEquals(fake.requests.length, 1); // only A's request ever reached the provider
  gate.resolve();
  const t = await pA;
  assertEquals(t.generation, 2); assertEquals(fake.refreshCalls, 1); assertEquals(fake.spentReuse, 0);
  assertEquals((await activeCred(NATIVE)).accessToken, t.accessToken.reveal());
});

// ---------------------------------------------------------------- dispatch failure & crashes
Deno.test('dispatch failure after possible rotation -> uncertain, credential blocked, no blind redispatch, no capture to recover', async () => {
  const { fake, s } = await nativeWorld();
  fake.throwAfterRotate = true;
  const a = await rig(fake, s);
  const e = await errOf(a.m.getLocationAccessToken(USE_A));
  assertEquals(e.code, 'recovery_required');
  const op = await opRow(e.opId!);
  assertEquals([op.phase, op.error_code, op.capture_envelope], ['uncertain', 'transport_failed', null]);
  assertEquals((await credRow(NATIVE)).state, 'recovery_required');
  fake.throwAfterRotate = false;
  assertEquals(await errCode((await rig(fake, s)).m.getLocationAccessToken(USE_A)), 'recovery_required');
  assertEquals(await errCode((await rig(fake, s)).m.recoverOperation(REC_A, e.opId!)), 'manual_recovery_required');
  assertEquals(fake.refreshCalls, 1);
});
Deno.test('crash before dispatch: recreated worker proceeds after lease expiry with exactly one provider call', async () => {
  const { fake, s } = await nativeWorld();
  const cfg = (leaseMs: number) => ({ clientId: 'client-1', clientSecret: CLIENT_SECRET, expirySkewMs: 60000, leaseMs, busyPollAttempts: 0, busyPollDelayMs: 0 });
  const a = await rig(fake, s, { config: cfg(1500), faults: { afterClaim: () => { throw new SimulatedCrash('afterClaim'); } } });
  assertEquals(await errCode(a.m.getLocationAccessToken(USE_A)), 'crash');
  assertEquals(await errCode((await rig(fake, s, { config: cfg(150) })).m.getLocationAccessToken(USE_A)), 'busy');
  assertEquals(fake.requests.length, 0);
  await sleep(1700);
  const t = await (await rig(fake, s)).m.getLocationAccessToken(USE_A);
  assertEquals(t.generation, 2); assertEquals(fake.refreshCalls, 1);
});
Deno.test('crash after dispatch authorization (possible dispatch, no response): blocked, manual recovery only', async () => {
  const { fake, s } = await nativeWorld();
  const a = await rig(fake, s, { faults: { afterAuthorize: () => { throw new SimulatedCrash('afterAuthorize'); } } });
  assertEquals(await errCode(a.m.getLocationAccessToken(USE_A)), 'crash');
  const opId = await lastOp();
  await sleep(300);
  assertEquals(await errCode((await rig(fake, s)).m.getLocationAccessToken(USE_A)), 'recovery_required');
  assertEquals(await errCode((await rig(fake, s)).m.recoverOperation(REC_A, opId)), 'manual_recovery_required');
  assertEquals(fake.requests.length, 0);
});
for (const point of ['afterCapture', 'beforeCommit'] as const) {
  Deno.test(`crash ${point}: recovery replays the SEALED response with no provider call and keeps the original expiry`, async () => {
    const { fake, seed, s } = await nativeWorld();
    const clock = { t: T0 };
    const a = await rig(fake, s, { faults: { [point]: () => { throw new SimulatedCrash(point); } } }, clock);
    assertEquals(await errCode(a.m.getLocationAccessToken(USE_A)), 'crash');
    const opId = await lastOp();
    assertEquals((await opRow(opId)).phase, 'captured');
    clock.t = T0 + 3 * 3_600_000; // restart much later
    await sleep(300);
    assertEquals(await errCode((await rig(fake, s, {}, clock)).m.getLocationAccessToken(USE_A)), 'recovery_required');
    const r = await (await rig(fake, s, {}, clock)).m.recoverOperation(REC_A, opId);
    assertEquals(r.generation, 2); assertEquals(fake.refreshCalls, 1);
    const c = await activeCred(NATIVE);
    assertEquals(c.expiresAt, T0 + 86_400_000); // original received-at, not restart time
    assertNotEquals(c.refreshToken, seed.refreshToken);
    assertEquals(fake.refreshTokens.get(c.refreshToken!)!.spent, false);
    const again = await (await rig(fake, s, {}, clock)).m.recoverOperation(REC_A, opId); // idempotent
    assertEquals(again.generation, 2); assertEquals((await credRow(NATIVE)).generation, 2);
    const t = await (await rig(fake, s, {}, clock)).m.getLocationAccessToken(USE_A);
    assertEquals(t.accessToken.reveal(), c.accessToken); assertEquals(fake.requests.length, 1);
  });
}
Deno.test('active commit failure after rotation: sealed latest pair recovered without another refresh; spent token never reused', async () => {
  const { fake, seed, s } = await nativeWorld();
  const spy = new SpyStore(); spy.failOnce.add('ghl_lc_commit');
  const e = await errOf((await rig(fake, s, { store: spy })).m.getLocationAccessToken(USE_A));
  assertEquals(e.code, 'commit_pending_recovery');
  assert(fake.refreshTokens.get(seed.refreshToken!)!.spent);
  await sleep(300);
  assertEquals(await errCode((await rig(fake, s)).m.getLocationAccessToken(USE_A)), 'recovery_required');
  const r = await (await rig(fake, s)).m.recoverOperation(REC_A, e.opId!);
  assertEquals(r.generation, 2); assertEquals(fake.refreshCalls, 1); assertEquals(fake.spentReuse, 0);
  assertEquals((await activeCred(NATIVE)).expiresAt, T0 + 86_400_000);
});
Deno.test('crash after commit before caller return: no second operation; recovery reports committed', async () => {
  const { fake, s } = await nativeWorld();
  const a = await rig(fake, s, { faults: { afterCommit: () => { throw new SimulatedCrash('afterCommit'); } } });
  assertEquals(await errCode(a.m.getLocationAccessToken(USE_A)), 'crash');
  const opId = await lastOp();
  const t = await (await rig(fake, s)).m.getLocationAccessToken(USE_A);
  assertEquals(t.generation, 2);
  assertEquals((await (await rig(fake, s)).m.recoverOperation(REC_A, opId)).generation, 2);
  assertEquals(fake.refreshCalls, 1); assertEquals(await sqlOk(`select count(*) from public.ghl_lc_ops`), '1');
});
Deno.test('recovery cannot publish over a newer generation', async () => {
  const { fake, s } = await nativeWorld();
  const a = await rig(fake, s, { faults: { afterCapture: () => { throw new SimulatedCrash('x'); } } });
  await errCode(a.m.getLocationAccessToken(USE_A));
  const opId = await lastOp();
  await sqlOk(`update public.ghl_lc_credentials set generation = 7 where id = '${NATIVE}'`); // simulate a newer published pair
  await sleep(300);
  assertEquals(await errCode((await rig(fake, s)).m.recoverOperation(REC_A, opId)), 'stale_generation');
  assertEquals((await credRow(NATIVE)).generation, 7); assertEquals(fake.refreshCalls, 1);
});
Deno.test('durability: crash after capture, then IMMEDIATE PostgreSQL restart, then recovery from disk', async () => {
  const { fake, s } = await nativeWorld();
  const a = await rig(fake, s, { faults: { afterCapture: () => { throw new SimulatedCrash('x'); } } });
  await errCode(a.m.getLocationAccessToken(USE_A));
  const opId = await lastOp();
  const r = await new Deno.Command('setpriv', { args: ['--reuid=lcpg', '--regid=65534', '--clear-groups', 'pg_ctl', '-D', '/tmp/lcpg/data', '-m', 'immediate', '-w',
    '-o', `-k ${PG.socketDir} -c listen_addresses= -p ${PG.port}`, '-l', '/tmp/lcpg/pg.log', 'restart'], clearEnv: true, env: { PATH: Deno.env.get('PATH')! },
    stdout: 'null', stderr: 'null' }).output();
  assertEquals(r.code, 0);
  assertEquals((await opRow(opId)).phase, 'captured');
  await sleep(200);
  assertEquals((await (await rig(fake, s)).m.recoverOperation(REC_A, opId)).generation, 2);
  assertEquals(fake.refreshCalls, 1);
});

// ---------------------------------------------------------------- validation-rejected / fail-closed
const mutations: [string, (b: Record<string, unknown>) => Record<string, unknown>, string][] = [
  ['wrong class', (b) => ({ ...b, userType: 'Company' }), 'wrong_class'],
  ['wrong company', (b) => ({ ...b, companyId: 'OtherCo' }), 'company_mismatch'],
  ['wrong location', (b) => ({ ...b, locationId: 'OtherLoc' }), 'location_mismatch'],
  ['incomplete pair', (b) => { const c = { ...b }; delete c.refresh_token; return c; }, 'missing_refresh_token'],
];
for (const [name, mut, code] of mutations) {
  Deno.test(`rejected candidate (${name}) is quarantined; old pair kept; credential blocked`, async () => {
    const { fake, seed, s } = await nativeWorld();
    fake.mutate = mut;
    const e = await errOf((await rig(fake, s)).m.getLocationAccessToken(USE_A));
    assertEquals(e.code, code);
    const op = await opRow(e.opId!);
    assertEquals(op.phase, 'validation_rejected'); assert(op.capture_envelope);
    const row = await credRow(NATIVE);
    assertEquals([row.state, row.generation], ['recovery_required', 1]);
    assertEquals((await activeCred(NATIVE)).refreshToken, seed.refreshToken);
    assertEquals(await errCode((await rig(fake, s)).m.getLocationAccessToken(USE_A)), 'recovery_required');
    assertEquals(fake.refreshCalls, 1);
  });
}
Deno.test('unchanged refresh token -> rotation_ambiguous, never success', async () => {
  const { fake, seed, s } = await nativeWorld();
  fake.mutate = (b) => ({ ...b, refresh_token: seed.refreshToken });
  const e = await errOf((await rig(fake, s)).m.getLocationAccessToken(USE_A));
  assertEquals(e.code, 'rotation_ambiguous');
  assertEquals((await opRow(e.opId!)).phase, 'validation_rejected');
  assertEquals((await credRow(NATIVE)).state, 'recovery_required');
});
Deno.test('exchange candidate for the wrong location is quarantined; child not connected', async () => {
  const { fake, s } = await derivedWorld();
  fake.mutate = (b) => ({ ...b, locationId: LOC_B });
  const e = await errOf((await rig(fake, s)).m.getLocationAccessToken(USE_A));
  assertEquals(e.code, 'location_mismatch');
  assertEquals((await credRow(CHILD_A)).state, 'recovery_required'); assertEquals((await credRow(PARENT)).state, 'active');
});
Deno.test('oversized response: not sealed, durable uncertainty, no fragment stored', async () => {
  const { fake, s } = await nativeWorld();
  fake.mutate = (b) => JSON.stringify({ ...b, pad: 'CANARY'.repeat(12000) });
  const e = await errOf((await rig(fake, s)).m.getLocationAccessToken(USE_A));
  assertEquals(e.code, 'recovery_required');
  const op = await opRow(e.opId!);
  assertEquals([op.phase, op.error_code, op.capture_envelope], ['uncertain', 'oversized_response', null]);
});
Deno.test('provider 4xx (invalid_grant): no expired mapping, no retry, credential unchanged', async () => {
  const { fake, s } = await nativeWorld();
  fake.status = 400;
  const e = await errOf((await rig(fake, s)).m.getLocationAccessToken(USE_A));
  assertEquals([e.code, e.status], ['provider_error', 400]);
  assertEquals((await opRow(e.opId!)).phase, 'provider_rejected');
  const row = await credRow(NATIVE);
  assertEquals([row.state, row.generation], ['active', 1]); assertEquals(fake.refreshCalls, 1);
});
Deno.test('corrupt active envelope / swapped ciphertext -> fail closed, zero provider calls', async () => {
  const { fake, s } = await derivedWorld({ childExp: VALID });
  await sqlOk(`update public.ghl_lc_credentials set envelope = (select envelope from public.ghl_lc_credentials where id='${CHILD_B}') where id='${CHILD_A}'`);
  assertEquals(await errCode((await rig(fake, s)).m.getLocationAccessToken(USE_A)), 'envelope_auth_failed');
  await sqlOk(`update public.ghl_lc_credentials set envelope = 'ghlenv1.k1.AAAA.BBBB' where id='${CHILD_B}'`);
  assertEquals(await errCode((await rig(fake, s)).m.getLocationAccessToken(USE_B)), 'envelope_malformed');
  assertEquals(fake.requests.length, 0);
});
Deno.test('missing journal row and unexpected storage error fail closed', async () => {
  const { fake, s } = await nativeWorld();
  assertEquals(await errCode((await rig(fake, s)).m.recoverOperation(REC_A, crypto.randomUUID())), 'operation_not_found');
  assertEquals(await errCode((await rig(fake, s)).m.recoverOperation(REC_A, 'not-a-uuid')), 'invalid_operation');
  const spy = new SpyStore(); spy.failOnce.add('ghl_lc_get_binding');
  assertEquals(await errCode((await rig(fake, s, { store: spy })).m.getLocationAccessToken(USE_A)), 'storage_failed');
  const spy2 = new SpyStore(); spy2.failOnce.add('ghl_lc_authorize_dispatch');
  assertEquals(await errCode((await rig(fake, s, { store: spy2 })).m.getLocationAccessToken(USE_A)), 'storage_failed');
  assertEquals(fake.requests.length, 0);
});
Deno.test('redaction: access-token holder never serializes the secret', async () => {
  const { fake, s } = await nativeWorld(VALID);
  const t = await (await rig(fake, s)).m.getLocationAccessToken(USE_A);
  for (const v of [JSON.stringify(t), String(t.accessToken), Deno.inspect(t)]) assert(!v.includes('CANARY'), v);
});

// ---------------------------------------------------------------- canary sweep (run last)
Deno.test('canaries: no token / client secret / key material in DB rows, public results, errors or logs', async () => {
  const { fake, s } = await derivedWorld({ parentExp: EXPIRED, childRefreshable: false });
  const r = await rig(fake, s);
  const t = await r.m.getLocationAccessToken(USE_A);
  SEEN.push(JSON.stringify(t), JSON.stringify(await r.m.describe(USE_A)), JSON.stringify(r.logs));
  fake.mutate = (b) => ({ ...b, userType: 'Company' });
  await sqlOk(`update public.ghl_lc_credentials set expires_at = now() - interval '10 days' where id='${CHILD_B}'`);
  await errCode(r.m.getLocationAccessToken(USE_B));
  SEEN.push(JSON.stringify(r.logs));
  const rows = await dumpAllRows();
  for (const hay of [rows, ...SEEN]) {
    assert(!hay.includes('CANARY'), 'token canary leaked');
    assert(!hay.includes(CLIENT_SECRET), 'client secret leaked');
    for (const k of KEY_CANARIES) assert(!hay.includes(k), 'key leaked');
  }
  assert(SEEN.length > 40);
});
````

### run-tests.sh
`sha256 abebb399f1d34ae7de329267469b175b7a800e1adec6073e925b7cb6cf2c670f`

````bash
#!/usr/bin/env bash
# Reproduce: disposable PostgreSQL 17 cluster on a Unix socket only (listen_addresses=''), run as an unprivileged
# local account because postgres refuses root. No project/hosted database, no network listener, fabricated data.
set -euo pipefail
cd "$(dirname "$0")"
PGDIR=/tmp/lcpg
if ! env -i PATH="$PATH" psql -h $PGDIR -p 55432 -U lc_super -d postgres -Atc 'select 1' >/dev/null 2>&1; then
  id lcpg >/dev/null 2>&1 || echo "lcpg:x:65534:65534::$PGDIR:/bin/sh" >> /etc/passwd
  rm -rf $PGDIR && mkdir -p $PGDIR && chown lcpg $PGDIR
  env -i PATH="$PATH" setpriv --reuid=lcpg --regid=65534 --clear-groups sh -c \
    "initdb -D $PGDIR/data -A trust -U lc_super >/dev/null && pg_ctl -D $PGDIR/data -w -o \"-k $PGDIR -c listen_addresses= -p 55432\" -l $PGDIR/pg.log start >/dev/null"
fi
sha256sum token-core.ts token-core.test.ts
deno --version | head -1
env -i PATH="$PATH" psql -h $PGDIR -p 55432 -U lc_super -d postgres -Atc 'select version()'
deno check token-core.ts lc-crypto.ts lc-pg-store.ts lc-manager.ts lc-test-helpers.ts
deno test token-core.test.ts
deno test lc-crypto.test.ts
deno test --allow-run=psql --allow-read=.,$PGDIR/pg.log --allow-env=PATH lc-sql.test.ts
deno test --allow-run=psql,setpriv --allow-read=.,$PGDIR/pg.log --allow-env=PATH lc-manager.test.ts
````

### ablate.sh
`sha256 a81022144bd3a644c9d457b99fde31ecbc5197e638e5b4d8cf9060a0e2b4373c`

````bash
#!/usr/bin/env bash
# Guard-ablation RED evidence: copy the slice, remove ONE guard, run the targeted test (expect FAIL), discard the copy.
set -u
run() { # name file python-replace(old,new) filter
  local name="$1" file="$2" old="$3" new="$4" filter="$5" d="/tmp/lc-abl"
  rm -rf "$d" && mkdir -p "$d" && cp /tmp/lc/*.ts /tmp/lc/*.sql "$d"/
  OLD="$old" NEW="$new" F="$d/$file" python3 -c 'import os;p=os.environ["F"];s=open(p).read();o=os.environ["OLD"];assert o in s,"anchor missing";open(p,"w").write(s.replace(o,os.environ["NEW"],1))'
  local t; t=$(ls "$d"/lc-*.test.ts | grep -E "$( [ "$file" = lc-crypto.ts ] && echo crypto || echo manager )")
  local out; out=$(cd "$d" && timeout 300 deno test -q --no-check --allow-run=psql,setpriv --allow-read="$d",/tmp/lcpg/pg.log --allow-env=PATH --filter "$filter" "$t" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "(ok|FAILED) \| [0-9]+ passed" | tail -1)
  echo "ABLATION [$name] filter=\"$filter\" -> $out"
}
run "claim takes over an expired lease even after dispatch" lc-schema.sql "elsif ph = 'claimed' then" "elsif true then" "expired lease while the old request"
run "claim skips expected-generation check" lc-schema.sql "if r.generation <> (p->>'expected_generation')::bigint then" "if false then" "stale reader"
run "transport returns before durable capture" lc-manager.ts "const cap = await this.#call('ghl_lc_capture'," "const cap = { status: 'ok' }; void ('ghl_lc_capture'," "crash afterCapture"
run "recovery uses restart clock instead of original received-at" lc-manager.ts "now: () => receivedAt }" "now: () => this.#now() }" "crash beforeCommit"
run "authority check removed (any caller resolves to a grant)" lc-manager.ts "if (!g || typeof g !== 'object' || g.action !== action" "g = g ?? { installationId: 'bbbbbbbb-0000-4000-8000-00000000000a', ownerUserId: '11111111-1111-4111-8111-111111111111', action }; if (!g || typeof g !== 'object' || g.action !== action" "authz: denied caller"
run "rejected candidate published anyway" lc-manager.ts "await this.#finish(opId, 'validation_rejected', code); // candidate stays sealed/quarantined" "await this.#finish(opId, 'not_dispatched', code);" "rejected candidate (wrong class)"
run "uncertain dispatch does not block the credential" lc-schema.sql "update public.ghl_lc_credentials set state = 'recovery_required' where id = o.target_credential_id;
  elsif" "update public.ghl_lc_credentials set claim_op = null, claim_until = null where claim_op = o.id;
  elsif" "dispatch failure after possible rotation"
run "key id not authenticated in AAD" lc-crypto.ts "const ad = aad(b, parts[1]);" "const ad = aad(b, 'k1');" "wrong key"
rm -rf /tmp/lc-abl
````
