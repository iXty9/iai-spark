ALTER TABLE public.ghl_installations
  ADD COLUMN IF NOT EXISTS refresh_lease_until timestamptz,
  ADD COLUMN IF NOT EXISTS token_generation integer NOT NULL DEFAULT 0;