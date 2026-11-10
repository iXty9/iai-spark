ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghl_skip_write_confirmations boolean NOT NULL DEFAULT false;
GRANT SELECT (ghl_skip_write_confirmations), UPDATE (ghl_skip_write_confirmations) ON public.profiles TO authenticated;

CREATE TABLE public.ghl_write_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  installation_id uuid NOT NULL,
  operation text NOT NULL,
  params_hash text NOT NULL,
  summary text NOT NULL,
  actor_iat bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
GRANT ALL ON public.ghl_write_confirmations TO service_role;
ALTER TABLE public.ghl_write_confirmations ENABLE ROW LEVEL SECURITY;
CREATE INDEX ghl_write_confirmations_user_created_idx ON public.ghl_write_confirmations (user_id, created_at DESC);