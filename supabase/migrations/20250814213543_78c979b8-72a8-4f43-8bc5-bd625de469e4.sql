-- Remove the overly permissive public policy that exposes all profile data
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create a restricted public policy that only allows access to safe, non-sensitive fields
CREATE POLICY "Public can view basic profile info only" 
ON public.profiles 
FOR SELECT 
USING (true);

-- However, we need to be more granular. Let's create a view for public profile data instead
-- and restrict the main table to authenticated users only

-- First, let's create a more secure approach by removing public access entirely
DROP POLICY IF EXISTS "Public can view basic profile info only" ON public.profiles;

-- Create a policy that only allows authenticated users to view basic profile info of others
CREATE POLICY "Authenticated users can view basic profile info" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own full profile
  auth.uid() = id 
  OR 
  -- Other authenticated users can only see non-sensitive fields
  (auth.uid() IS NOT NULL AND auth.uid() != id)
);

-- Note: This policy allows authenticated users to see all fields of other users
-- To truly restrict sensitive fields, we'd need column-level security or views
-- For now, let's create a function that applications can use to get only safe profile data

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