-- Remove the dangerous public access policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Remove any other overly permissive policies that might exist
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a secure public view for legitimate cross-user profile viewing (only non-sensitive fields)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  avatar_url,
  first_name,
  last_name
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Create RLS policy for the public view
CREATE POLICY "Public view shows limited profile data" 
ON public.public_profiles 
FOR SELECT 
USING (true);

-- Ensure the main profiles table has proper user-specific policies
-- (keeping existing policies but making sure we have proper coverage)

-- Additional security: Create audit function for sensitive profile changes
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
$$ LANGUAGE plpgsql SECURITY DEFINER;