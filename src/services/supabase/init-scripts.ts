
/**
 * SQL scripts for initializing a Supabase database
 */

export const initScripts = {
  // Create app_role enum
  createAppRoleEnum: `
    CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'moderator', 'user');
  `,
  
  // Create profiles table 
  createProfilesTable: `
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
      first_name TEXT,
      last_name TEXT,
      phone_number TEXT,
      theme_settings TEXT,
      phone_country_code TEXT DEFAULT '+1',
      username TEXT,
      avatar_url TEXT,
      webhook_url TEXT DEFAULT 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d36574'
    );
  `,
  
  // Create user_roles table
  createUserRolesTable: `
    CREATE TABLE IF NOT EXISTS public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
      role app_role NOT NULL DEFAULT 'user',
      UNIQUE (user_id, role)
    );
  `,
  
  // Create app_settings table
  createAppSettingsTable: `
    CREATE TABLE IF NOT EXISTS public.app_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_by UUID
    );
  `,
  
  // Create has_role function
  createHasRoleFunction: `
    CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
    RETURNS boolean
    LANGUAGE sql
    STABLE SECURITY DEFINER
    AS $$
      SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
      )
    $$;
  `,
  
  // Create handle_new_user function
  createHandleNewUserFunction: `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    BEGIN
      INSERT INTO public.profiles (id, username)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email)
      );
      RETURN NEW;
    END;
    $$;
  `,
  
  // Create user creation trigger
  createUserTrigger: `
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  `,
  
  // Enable RLS on tables
  enableRLS: `
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
  `,
  
  // Create RLS policies
  createRLSPolicies: `
    -- Profiles policies
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    CREATE POLICY "Users can view their own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    CREATE POLICY "Users can update their own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
    
    -- User roles policies
    DROP POLICY IF EXISTS "Admins can select user roles" ON public.user_roles;
    CREATE POLICY "Admins can select user roles" ON public.user_roles
      FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
      
    DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
    CREATE POLICY "Admins can insert user roles" ON public.user_roles
      FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
      
    DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
    CREATE POLICY "Admins can update user roles" ON public.user_roles
      FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
      
    DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
    CREATE POLICY "Admins can delete user roles" ON public.user_roles
      FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
    
    -- App settings policies
    DROP POLICY IF EXISTS "Admins can select app settings" ON public.app_settings;
    CREATE POLICY "Admins can select app settings" ON public.app_settings
      FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
      
    DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
    CREATE POLICY "Admins can insert app settings" ON public.app_settings
      FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
      
    DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
    CREATE POLICY "Admins can update app settings" ON public.app_settings
      FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
      
    DROP POLICY IF EXISTS "Admins can delete app settings" ON public.app_settings;
    CREATE POLICY "Admins can delete app settings" ON public.app_settings
      FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
  `
};

/**
 * Get all initialization scripts in the correct order
 */
export function getAllInitScripts(): string[] {
  return [
    initScripts.createAppRoleEnum,
    initScripts.createProfilesTable,
    initScripts.createUserRolesTable,
    initScripts.createAppSettingsTable,
    initScripts.createHasRoleFunction,
    initScripts.createHandleNewUserFunction,
    initScripts.createUserTrigger,
    initScripts.enableRLS,
    initScripts.createRLSPolicies
  ];
}
