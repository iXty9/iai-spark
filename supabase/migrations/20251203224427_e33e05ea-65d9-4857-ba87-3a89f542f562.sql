-- Fix: Remove webhook_auth_header_value from authenticated users policy
-- This secret token should only be readable by admins

DROP POLICY IF EXISTS "Authenticated users can read authenticated webhook settings" ON app_settings;

CREATE POLICY "Authenticated users can read authenticated webhook settings"
ON app_settings FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  key = ANY (ARRAY[
    'anonymous_webhook_url', 'anonymous_webhook_url_use_auth',
    'authenticated_webhook_url', 'authenticated_webhook_url_use_auth',
    'debug_webhook_url', 'debug_webhook_url_use_auth',
    'thumbs_up_webhook_url', 'thumbs_up_webhook_url_use_auth',
    'thumbs_down_webhook_url', 'thumbs_down_webhook_url_use_auth',
    'user_signup_webhook_url', 'user_signup_webhook_url_use_auth',
    'webhook_auth_header_name', 'webhook_timeout'
    -- REMOVED: 'webhook_auth_header_value' - this is a secret that only admins should access
  ])
);