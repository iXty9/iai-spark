-- Remove the overly permissive policy that allows authenticated users to see all profile data
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- Create a strict policy that only allows users to see their own complete profile
CREATE POLICY "Users can only view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- For cases where the application needs to show other users' public info,
-- applications should use the get_public_profile() function instead of direct table access

-- Let's also update the function to be more secure and add a policy for it
-- First, revoke public access to the profiles table entirely
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

-- Grant specific access only through RLS policies
GRANT SELECT ON public.profiles TO authenticated;

-- Ensure the get_public_profile function can still be used by authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon;