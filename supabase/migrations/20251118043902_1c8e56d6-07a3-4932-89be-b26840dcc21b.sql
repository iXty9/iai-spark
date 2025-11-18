-- Fix RLS policy to allow authenticated users to read avatar and webhook URLs
DROP POLICY IF EXISTS "Authenticated users can read safe app settings" ON public.app_settings;

CREATE POLICY "Authenticated users can read safe app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (
  is_safe_app_setting(key)
  OR key = ANY (ARRAY[
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
    'anonymous_webhook_url',
    'authenticated_webhook_url',
    'webhook_timeout'
  ])
);

-- Ensure signup trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();