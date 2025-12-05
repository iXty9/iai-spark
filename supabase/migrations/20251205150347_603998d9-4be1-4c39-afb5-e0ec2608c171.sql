-- Add RLS policies for admins to view and update any user profile

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can update all profiles  
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update audit trigger to capture admin edits
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_id uuid;
  is_admin_edit boolean;
BEGIN
  actor_id := auth.uid();
  is_admin_edit := (actor_id IS DISTINCT FROM NEW.id);
  
  -- Log sensitive field changes
  IF (OLD.phone_number IS DISTINCT FROM NEW.phone_number) OR
     (OLD.location_latitude IS DISTINCT FROM NEW.location_latitude) OR
     (OLD.location_longitude IS DISTINCT FROM NEW.location_longitude) OR
     (OLD.webhook_url IS DISTINCT FROM NEW.webhook_url) OR
     (OLD.username IS DISTINCT FROM NEW.username) OR
     (OLD.first_name IS DISTINCT FROM NEW.first_name) OR
     (OLD.last_name IS DISTINCT FROM NEW.last_name) THEN
    
    INSERT INTO public.user_notifications (
      user_id,
      title,
      message,
      type,
      source,
      metadata
    ) VALUES (
      NEW.id,
      CASE WHEN is_admin_edit THEN 'Profile Updated by Admin' ELSE 'Profile Security Update' END,
      CASE WHEN is_admin_edit THEN 'An administrator modified your profile' ELSE 'Sensitive profile information was modified' END,
      'security',
      'system',
      jsonb_build_object(
        'action', 'profile_update',
        'timestamp', now(),
        'actor_id', actor_id,
        'is_admin_edit', is_admin_edit,
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
        END ||
        CASE 
          WHEN OLD.username IS DISTINCT FROM NEW.username THEN 'username,'
          ELSE ''
        END ||
        CASE 
          WHEN OLD.first_name IS DISTINCT FROM NEW.first_name OR OLD.last_name IS DISTINCT FROM NEW.last_name THEN 'name,'
          ELSE ''
        END
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;