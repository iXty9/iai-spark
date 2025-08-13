-- Complete security hardening (fixed version)

-- Fix role escalation protection - ensure users cannot modify their own roles
DROP POLICY IF EXISTS "Users can view own roles or admins can view all" ON public.user_roles;

CREATE POLICY "Users can view own roles or admins can view all"
ON public.user_roles
FOR SELECT
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Ensure users cannot insert/update/delete their own roles (only admins can)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Harden database functions with proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update other security functions with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Create the audit function that was referenced in the previous migration
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log sensitive field changes
  IF (OLD.phone_number IS DISTINCT FROM NEW.phone_number) OR
     (OLD.location_latitude IS DISTINCT FROM NEW.location_latitude) OR
     (OLD.location_longitude IS DISTINCT FROM NEW.location_longitude) OR
     (OLD.webhook_url IS DISTINCT FROM NEW.webhook_url) THEN
    
    INSERT INTO public.user_notifications (
      user_id,
      title,
      message,
      type,
      source,
      metadata
    ) VALUES (
      NEW.id,
      'Profile Security Update',
      'Sensitive profile information was modified',
      'security',
      'system',
      jsonb_build_object(
        'action', 'profile_update',
        'timestamp', now(),
        'fields_changed', CASE 
          WHEN OLD.phone_number IS DISTINCT FROM NEW.phone_number THEN 'phone_number,'
          ELSE ''
        END ||
        CASE 
          WHEN OLD.location_latitude IS DISTINCT FROM NEW.location_latitude THEN 'location,'
          ELSE ''
        END ||
        CASE 
          WHEN OLD.webhook_url IS DISTINCT FROM NEW.webhook_url THEN 'webhook_url,'
          ELSE ''
        END
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger for profile audit logging
CREATE TRIGGER audit_profile_changes_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.audit_profile_changes();

-- Add webhook URL validation function with domain restrictions
CREATE OR REPLACE FUNCTION public.validate_webhook_url()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate webhook URL format and restrict to safe domains
  IF NEW.webhook_url IS NOT NULL AND NEW.webhook_url != '' THEN
    -- Basic URL validation
    IF NEW.webhook_url !~ '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.*$' THEN
      RAISE EXCEPTION 'Invalid webhook URL format. Must be a valid HTTP/HTTPS URL.';
    END IF;
    
    -- Prevent localhost and internal IP addresses for security
    IF NEW.webhook_url ~* '(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' THEN
      RAISE EXCEPTION 'Webhook URL cannot point to localhost or internal IP addresses.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

-- Create trigger for webhook URL validation
CREATE TRIGGER validate_webhook_url_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_webhook_url();

-- Enhanced app settings security
CREATE OR REPLACE FUNCTION public.is_safe_app_setting(setting_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT setting_key NOT LIKE '%supabase%' 
    AND setting_key NOT LIKE '%key%'
    AND setting_key NOT LIKE '%secret%'
    AND setting_key NOT LIKE '%password%'
    AND setting_key NOT LIKE '%token%'
    AND setting_key NOT LIKE '%credential%'
    AND setting_key NOT LIKE '%url%'
    AND setting_key NOT LIKE '%api%'
    AND setting_key NOT IN ('service_role_key', 'anon_key', 'database_url', 'jwt_secret')
    AND LENGTH(setting_key) > 0
    AND setting_key ~ '^[a-zA-Z0-9_]+$';
$$;