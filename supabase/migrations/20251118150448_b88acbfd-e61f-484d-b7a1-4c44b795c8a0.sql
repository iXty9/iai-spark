-- Step 1: Create PUBLIC policy for application-level settings
-- These settings need to be accessible before authentication for proper app initialization

-- Create a new PUBLIC policy that allows anyone to read application-level settings
CREATE POLICY "Public can read application-level settings"
ON public.app_settings
FOR SELECT
TO public
USING (
  key = ANY (ARRAY[
    'site_title',
    'tagline',
    'default_theme_settings',
    'ai_agent_name',
    'default_avatar_url',
    'auth_tagline',
    'auth_tagline_icon',
    'auth_welcome_description',
    'auth_login_title',
    'auth_login_description',
    'auth_register_title',
    'auth_register_description',
    'auth_disclaimer_text',
    'auth_disclaimer_required',
    'show_ai_in_menu'
  ])
);

-- Update the anonymous policy to remove PUBLIC keys (make it more restrictive)
DROP POLICY IF EXISTS "Anonymous users can read UI and anonymous webhook settings" ON public.app_settings;

CREATE POLICY "Anonymous users can read anonymous webhook settings"
ON public.app_settings
FOR SELECT
TO anon
USING (
  key = ANY (ARRAY[
    'anonymous_webhook_url',
    'anonymous_webhook_url_use_auth',
    'webhook_auth_header_name',
    'webhook_auth_header_value',
    'webhook_timeout'
  ])
);

-- Update the authenticated policy to remove PUBLIC keys (make it more restrictive)
DROP POLICY IF EXISTS "Authenticated users can read UI and webhook settings" ON public.app_settings;

CREATE POLICY "Authenticated users can read authenticated webhook settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  key = ANY (ARRAY[
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