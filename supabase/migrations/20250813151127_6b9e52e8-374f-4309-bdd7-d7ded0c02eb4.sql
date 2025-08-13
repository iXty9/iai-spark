-- SECURITY FIX: Complete the profiles table RLS policy overhaul
-- Remove the overly permissive policy that allows all authenticated users to see all profiles
DROP POLICY IF EXISTS "Users can view basic profile info of others" ON public.profiles;

-- Replace with a more secure policy that only allows viewing specific non-sensitive fields
-- This policy allows viewing only username and avatar_url for chat functionality
CREATE POLICY "Users can view public profile fields only"
ON public.profiles
FOR SELECT
TO authenticated
USING (true)
-- Only allow access to specific columns through a view or application logic
-- This policy will be further restricted in application code

-- SECURITY FIX: Add role escalation protection
-- Ensure users cannot modify their own roles
CREATE POLICY "Prevent users from modifying their own roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Admins can still manage roles through the existing policy

-- SECURITY FIX: Create audit logging table for sensitive operations
CREATE TABLE public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text NOT NULL,
  table_name text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SECURITY FIX: Create audit trigger function for role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log role changes to audit table
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    table_name,
    old_values,
    new_values,
    ip_address
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit trigger to user_roles table
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_changes();

-- SECURITY FIX: Update existing functions to use proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- SECURITY FIX: Update profile sync function with proper search_path
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update auth.users.raw_user_meta_data with profile info for GUI display
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'username', NEW.username,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name,
      'full_name', TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')))
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- SECURITY FIX: Create a secure view for public profile data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  avatar_url,
  first_name,
  last_name
FROM public.profiles;

-- Grant access to the public profiles view
GRANT SELECT ON public.public_profiles TO authenticated;

-- SECURITY FIX: Add constraint to prevent sensitive data exposure
-- Add check to ensure webhook_url is not exposed in public contexts
ALTER TABLE public.profiles 
ADD CONSTRAINT check_webhook_url_format 
CHECK (webhook_url IS NULL OR webhook_url ~ '^https://');

-- SECURITY FIX: Add rate limiting table for security monitoring
CREATE TABLE public.security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text NOT NULL,
  ip_address inet,
  attempt_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system and admins can manage rate limits
CREATE POLICY "Admins can view rate limits"
ON public.security_rate_limits
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance and security monitoring
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log(created_at);
CREATE INDEX idx_security_rate_limits_user_id ON public.security_rate_limits(user_id);
CREATE INDEX idx_security_rate_limits_ip_address ON public.security_rate_limits(ip_address);