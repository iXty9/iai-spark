-- Add webhook authentication configuration to app_settings
INSERT INTO public.app_settings (key, value) VALUES 
  ('webhook_auth_header_name', 'X-Webhook-Token'),
  ('webhook_auth_header_value', ''),
  ('authenticated_webhook_url_use_auth', 'false'),
  ('anonymous_webhook_url_use_auth', 'false'),
  ('debug_webhook_url_use_auth', 'false'),
  ('thumbs_up_webhook_url_use_auth', 'false'),
  ('thumbs_down_webhook_url_use_auth', 'false'),
  ('user_signup_webhook_url_use_auth', 'false')
ON CONFLICT (key) DO NOTHING;