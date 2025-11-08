-- Fix MISSING_RLS: Replace permissive notification policy with secure service-role-only policy
DROP POLICY IF EXISTS "System can insert notifications for users" ON public.user_notifications;

-- Block all client-side notification inserts - only service role can insert
CREATE POLICY "Block client-side notification inserts"
ON public.user_notifications FOR INSERT
WITH CHECK (false);

-- Add comment for clarity
COMMENT ON POLICY "Block client-side notification inserts" ON public.user_notifications IS 'Security: Prevents client-side notification spam. Only edge functions with service role key can insert notifications.';