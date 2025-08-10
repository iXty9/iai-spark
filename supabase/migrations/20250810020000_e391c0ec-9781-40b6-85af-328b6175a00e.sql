-- Fix function search_path per linter
ALTER FUNCTION public.cleanup_old_notifications() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;