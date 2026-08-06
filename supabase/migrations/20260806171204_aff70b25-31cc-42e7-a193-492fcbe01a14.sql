-- Remove blanket privileges from client roles, then re-grant the minimum each role needs.

-- Service-only table: no client access at all.
REVOKE ALL ON public.ghl_webhook_dedup FROM anon, authenticated;
GRANT ALL ON public.ghl_webhook_dedup TO service_role;

-- app_settings: anon needs read for bootstrap settings; authenticated (admins via RLS) manage.
REVOKE ALL ON public.app_settings FROM anon, authenticated;
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- profiles: every policy is scoped to auth.uid() or admin, so anon gets nothing.
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- active_chat_messages
REVOKE ALL ON public.active_chat_messages FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.active_chat_messages TO authenticated;
GRANT ALL ON public.active_chat_messages TO service_role;

-- user_notifications
REVOKE ALL ON public.user_notifications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

-- sound_settings
REVOKE ALL ON public.sound_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sound_settings TO authenticated;
GRANT ALL ON public.sound_settings TO service_role;

-- user_roles
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- ghl_installations (no client INSERT policy exists)
REVOKE ALL ON public.ghl_installations FROM anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.ghl_installations TO authenticated;
GRANT ALL ON public.ghl_installations TO service_role;

-- hermes_allowed_users (admin-only via RLS)
REVOKE ALL ON public.hermes_allowed_users FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hermes_allowed_users TO authenticated;
GRANT ALL ON public.hermes_allowed_users TO service_role;