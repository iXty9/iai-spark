-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can read authenticated webhook settings" ON public.app_settings;

-- Recreate with webhook_auth_header_value added
CREATE POLICY "Authenticated users can read authenticated webhook settings"
ON public.app_settings
FOR SELECT
TO public
USING (
  auth.uid() IS NOT NULL
  AND key = ANY (ARRAY[
    'anonymous_webhook_url',
    'anonymous_webhook_url_use_auth',
    'authenticated_webhook_url',
    'authenticated_webhook_url_use_auth',
    'debug_webhook_url',
    'debug_webhook_url_use_auth',
    'thumbs_up_webhook_url',
    'thumbs_up_webhook_url_use_auth',
    'thumbs_down_webhook_url',
    'thumbs_down_webhook_url_use_auth',
    'user_signup_webhook_url',
    'user_signup_webhook_url_use_auth',
    'webhook_auth_header_name',
    'webhook_auth_header_value',
    'webhook_timeout'
  ])
);