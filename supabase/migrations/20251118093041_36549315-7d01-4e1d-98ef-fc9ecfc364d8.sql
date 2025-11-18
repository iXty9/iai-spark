-- Phase 1: Fix app_settings RLS policies to allow authenticated chat
-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Anonymous users can read basic UI settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can read safe app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public users can read chat webhook URLs" ON public.app_settings;

-- Create comprehensive policy for anonymous users
CREATE POLICY "Anonymous users can read UI and anonymous webhook settings"
ON public.app_settings
FOR SELECT
TO anon
USING (
  key = ANY (ARRAY[
    -- UI Settings
    'site_title',
    'tagline',
    'auth_tagline',
    'auth_tagline_icon',
    'auth_welcome_description',
    'auth_login_title',
    'auth_login_description',
    'auth_register_title',
    'auth_register_description',
    'auth_disclaimer_text',
    'auth_disclaimer_required',
    'default_avatar_url',
    'ai_agent_name',
    'show_ai_in_menu',
    'default_theme_settings',
    -- Anonymous webhook configuration (needed for anonymous chat)
    'anonymous_webhook_url',
    'anonymous_webhook_url_use_auth',
    'webhook_auth_header_name',
    'webhook_auth_header_value',
    'webhook_timeout'
  ])
);

-- Create comprehensive policy for authenticated users
CREATE POLICY "Authenticated users can read UI and webhook settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  key = ANY (ARRAY[
    -- UI Settings
    'site_title',
    'tagline',
    'auth_tagline',
    'auth_tagline_icon',
    'auth_welcome_description',
    'auth_login_title',
    'auth_login_description',
    'auth_register_title',
    'auth_register_description',
    'auth_disclaimer_text',
    'auth_disclaimer_required',
    'default_avatar_url',
    'ai_agent_name',
    'show_ai_in_menu',
    'default_theme_settings',
    -- Webhook configuration (needed for chat functionality)
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

-- Phase 2: Verify user role assignment for existing user
-- Check and add 'user' role if missing
INSERT INTO public.user_roles (user_id, role)
VALUES ('9dff292c-d63a-416b-a6fa-0795fec68c1b', 'user'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;