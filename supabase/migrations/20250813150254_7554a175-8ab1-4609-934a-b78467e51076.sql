-- Remove the dangerous public read policies for app_settings
DROP POLICY IF EXISTS "Allow anonymous read access to app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

-- Create a function to determine if a setting is safe for public/user access
CREATE OR REPLACE FUNCTION public.is_safe_app_setting(setting_key text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT setting_key NOT LIKE '%supabase%' 
    AND setting_key NOT LIKE '%key%'
    AND setting_key NOT LIKE '%secret%'
    AND setting_key NOT LIKE '%password%'
    AND setting_key NOT LIKE '%token%'
    AND setting_key NOT LIKE '%credential%'
    AND setting_key NOT LIKE '%url%'
    AND setting_key NOT IN ('service_role_key', 'anon_key', 'database_url');
$$;

-- Create a policy for authenticated users to read only safe settings
CREATE POLICY "Authenticated users can read safe app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (public.is_safe_app_setting(key));

-- Create a policy for anonymous users to read only very basic UI settings
CREATE POLICY "Anonymous users can read basic UI settings"
ON public.app_settings
FOR SELECT
TO anon
USING (key IN (
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
  'default_theme_settings'
));