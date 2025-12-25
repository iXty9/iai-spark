-- Add auth provider settings to app_settings
INSERT INTO public.app_settings (key, value)
VALUES 
  ('auth_email_password_enabled', 'true'),
  ('auth_keycloak_enabled', 'false'),
  ('auth_keycloak_button_label', 'iXty9 ID')
ON CONFLICT (key) DO NOTHING;

-- Update RLS policy to allow reading auth provider settings publicly
DROP POLICY IF EXISTS "Public can read application-level settings" ON public.app_settings;

CREATE POLICY "Public can read application-level settings" 
ON public.app_settings 
FOR SELECT 
USING (key = ANY (ARRAY[
  'site_title'::text, 
  'tagline'::text, 
  'default_theme_settings'::text, 
  'ai_agent_name'::text, 
  'default_avatar_url'::text, 
  'auth_tagline'::text, 
  'auth_tagline_icon'::text, 
  'auth_welcome_description'::text, 
  'auth_login_title'::text, 
  'auth_login_description'::text, 
  'auth_register_title'::text, 
  'auth_register_description'::text, 
  'auth_disclaimer_text'::text, 
  'auth_disclaimer_required'::text, 
  'show_ai_in_menu'::text,
  'auth_email_password_enabled'::text,
  'auth_keycloak_enabled'::text,
  'auth_keycloak_button_label'::text
]));