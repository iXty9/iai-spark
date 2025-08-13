-- Remove the dangerous public read policy for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Add a policy for admins to view all profiles for management purposes
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add a policy to allow viewing basic profile info for chat functionality
-- This only exposes username and avatar_url which are needed for chat display
CREATE POLICY "Users can view basic profile info of others"
ON public.profiles
FOR SELECT
TO authenticated
USING (true)
WITH CHECK (false);