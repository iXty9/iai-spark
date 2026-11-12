DELETE FROM public.app_settings WHERE key IN ('ghl_proxy_secret', 'ghl_notification_shadow_url');
INSERT INTO public.app_settings (key, value) VALUES ('proactive_post_lock_enabled', 'false')
ON CONFLICT (key) DO NOTHING;