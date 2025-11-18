-- Update handle_new_user function to assign default role and extract phone data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile with phone data
  INSERT INTO public.profiles (id, username, first_name, last_name, phone_number, phone_country_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone_number',
    COALESCE(NEW.raw_user_meta_data->>'phone_country_code', '+1')
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role);
  
  RETURN NEW;
END;
$$;

-- Fix existing user ixty4u: assign role
INSERT INTO public.user_roles (user_id, role)
VALUES ('9dff292c-d63a-416b-a6fa-0795fec68c1b', 'user'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;