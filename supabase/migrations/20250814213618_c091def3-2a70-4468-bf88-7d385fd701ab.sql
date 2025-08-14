-- Fix the search path issue for the get_public_profile function
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  first_name text,
  last_name text
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.first_name,
    p.last_name
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;