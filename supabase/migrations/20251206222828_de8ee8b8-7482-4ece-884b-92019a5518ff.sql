-- Add ghl_client_id to app_settings (non-sensitive, needed for frontend OAuth URL)
-- This allows admins to configure the GHL client ID without hardcoding

INSERT INTO public.app_settings (key, value)
VALUES ('ghl_client_id', '')
ON CONFLICT (key) DO NOTHING;

-- Add RLS policy to allow authenticated users to read ghl_client_id
-- (needed for OAuth URL construction in frontend)
DROP POLICY IF EXISTS "Authenticated users can read GHL client id" ON public.app_settings;

CREATE POLICY "Authenticated users can read GHL client id"
ON public.app_settings
FOR SELECT
USING (key = 'ghl_client_id');