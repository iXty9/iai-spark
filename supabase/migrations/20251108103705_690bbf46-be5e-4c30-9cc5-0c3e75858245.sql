-- Allow public users (both authenticated and anonymous) to read webhook URLs needed for chat
CREATE POLICY "Public users can read chat webhook URLs"
ON public.app_settings
FOR SELECT
TO public
USING (
  key IN (
    'anonymous_webhook_url',
    'authenticated_webhook_url',
    'webhook_timeout'
  )
);