-- Drop and recreate the authenticated users webhook settings policy to include chat_recall_webhook_url
DROP POLICY IF EXISTS "Authenticated users can read authenticated webhook settings" ON public.app_settings;

CREATE POLICY "Authenticated users can read authenticated webhook settings" 
ON public.app_settings 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) AND (key = ANY (ARRAY[
    'anonymous_webhook_url'::text, 
    'anonymous_webhook_url_use_auth'::text, 
    'authenticated_webhook_url'::text, 
    'authenticated_webhook_url_use_auth'::text, 
    'debug_webhook_url'::text, 
    'debug_webhook_url_use_auth'::text, 
    'thumbs_up_webhook_url'::text, 
    'thumbs_up_webhook_url_use_auth'::text, 
    'thumbs_down_webhook_url'::text, 
    'thumbs_down_webhook_url_use_auth'::text, 
    'user_signup_webhook_url'::text, 
    'user_signup_webhook_url_use_auth'::text, 
    'clear_context_webhook_url'::text, 
    'clear_context_webhook_url_use_auth'::text,
    'chat_recall_webhook_url'::text,
    'chat_recall_webhook_url_use_auth'::text,
    'webhook_auth_header_name'::text, 
    'webhook_auth_header_value'::text, 
    'webhook_timeout'::text
  ]))
);