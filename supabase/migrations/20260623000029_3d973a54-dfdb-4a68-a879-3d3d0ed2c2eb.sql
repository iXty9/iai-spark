
-- 1. profiles.preferred_backend
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_backend text;

UPDATE public.profiles
  SET preferred_backend = 'webhook'
  WHERE preferred_backend IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN preferred_backend SET DEFAULT 'webhook';

ALTER TABLE public.profiles
  ALTER COLUMN preferred_backend SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_preferred_backend_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_preferred_backend_check
      CHECK (preferred_backend IN ('webhook', 'hermes'));
  END IF;
END $$;

-- 2. hermes_allowed_users
CREATE TABLE IF NOT EXISTS public.hermes_allowed_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hermes_allowed_users TO authenticated;
GRANT ALL ON public.hermes_allowed_users TO service_role;

ALTER TABLE public.hermes_allowed_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view Hermes allowlist" ON public.hermes_allowed_users;
CREATE POLICY "Admins can view Hermes allowlist"
  ON public.hermes_allowed_users
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert Hermes allowlist" ON public.hermes_allowed_users;
CREATE POLICY "Admins can insert Hermes allowlist"
  ON public.hermes_allowed_users
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update Hermes allowlist" ON public.hermes_allowed_users;
CREATE POLICY "Admins can update Hermes allowlist"
  ON public.hermes_allowed_users
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete Hermes allowlist" ON public.hermes_allowed_users;
CREATE POLICY "Admins can delete Hermes allowlist"
  ON public.hermes_allowed_users
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_hermes_allowed_users_updated_at ON public.hermes_allowed_users;
CREATE TRIGGER update_hermes_allowed_users_updated_at
  BEFORE UPDATE ON public.hermes_allowed_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
