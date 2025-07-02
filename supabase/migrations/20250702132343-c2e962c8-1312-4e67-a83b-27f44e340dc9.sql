-- Create trigger to automatically create profiles when users sign up
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

-- Update existing trigger to handle new profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to sync profile updates back to auth.users for GUI display
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

-- Create trigger to sync profile updates to auth.users
DROP TRIGGER IF EXISTS sync_profile_updates ON public.profiles;
CREATE TRIGGER sync_profile_updates
  AFTER UPDATE ON public.profiles
  FOR EACH ROW 
  WHEN (OLD.username IS DISTINCT FROM NEW.username OR 
        OLD.first_name IS DISTINCT FROM NEW.first_name OR 
        OLD.last_name IS DISTINCT FROM NEW.last_name)
  EXECUTE PROCEDURE public.sync_profile_to_auth();

-- Sync existing profile data to auth.users for current users
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'username', p.username,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'full_name', TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
  )
FROM public.profiles p
WHERE auth.users.id = p.id
  AND (p.username IS NOT NULL OR p.first_name IS NOT NULL OR p.last_name IS NOT NULL);