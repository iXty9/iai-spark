
/**
 * SQL scripts for initializing a Supabase database
 */
const avatarsPolicies = [
  { name: 'Avatar Select Policy',    action: 'SELECT', cond: 'auth.role() = \'authenticated\' OR (storage.foldername(name))[1] = auth.uid()', kind: 'USING' },
  { name: 'Avatar Insert Policy',    action: 'INSERT', cond: 'auth.role() = \'authenticated\' AND (storage.foldername(name))[1] = auth.uid()', kind: 'WITH CHECK' },
  { name: 'Avatar Update Policy',    action: 'UPDATE', cond: 'auth.role() = \'authenticated\' AND (storage.foldername(name))[1] = auth.uid()', kind: 'USING' },
  { name: 'Avatar Delete Policy',    action: 'DELETE', cond: 'auth.role() = \'authenticated\' AND (storage.foldername(name))[1] = auth.uid()', kind: 'USING' },
];

// One DO block for avatars RLS policy creation
const createAvatarsRLSPolicies = avatarsPolicies.map(
  p => `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM storage.policies
        WHERE name = '${p.name}' AND bucket_id = 'avatars'
      ) THEN
        CREATE POLICY "${p.name}"
          ON storage.objects FOR ${p.action}
          ${p.kind} (bucket_id = 'avatars' AND ${p.cond});
      END IF;
    END $$;`
).join('\n');

// App role/admin permissions policies for convenience/clarity
const adminTables = ['user_roles', 'app_settings'];
const adminActions = [
  {act: 'SELECT', cond: 'USING'},
  {act: 'INSERT', cond: 'WITH CHECK'},
  {act: 'UPDATE', cond: 'USING'},
  {act: 'DELETE', cond: 'USING'}
];

function adminPolicySql(table) {
  return adminActions.map(({act, cond}) => `
    DROP POLICY IF EXISTS "Admins can ${act.toLowerCase()} ${table.replace('_',' ')}" ON public.${table};
    CREATE POLICY "Admins can ${act.toLowerCase()} ${table.replace('_',' ')}" ON public.${table}
      FOR ${act} ${cond === 'USING' ? 'USING' : 'WITH CHECK'} (public.has_role(auth.uid(), 'admin'));
  `).join('');
}

export const initScripts = {
  createAppRoleEnum: `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
      END IF;
    END
    $$;
  `,
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
  createUserRolesTable: `
    CREATE TABLE IF NOT EXISTS public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users ON DELETE CASCADE,
      role app_role DEFAULT 'user',
      UNIQUE (user_id, role)
    );
  `,
  createAppSettingsTable: `
    CREATE TABLE IF NOT EXISTS public.app_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT,
      value TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_by UUID
    );
  `,
  insertDefaultSettings: `
    -- Insert default webhook and avatar settings if they don't exist
    INSERT INTO public.app_settings (key, value) VALUES 
      ('authenticated_webhook_url', 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d014f7'),
      ('anonymous_webhook_url', 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d36574'),
      ('debug_webhook_url', 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d8534'),
      ('thumbs_up_webhook_url', ''),
      ('thumbs_down_webhook_url', ''),
      ('webhook_timeout', '300000'),
      ('default_avatar_url', 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png'),
      ('websocket_enabled', 'false'),
      ('app_name', 'The Everywhere Intelligent Assistant'),
      ('site_title', 'AI Chat Application')
    ON CONFLICT (key) DO NOTHING;
  `,
  createHasRoleFunction: `
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
  `,
  createHandleNewUserFunction: `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = 'public'
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
  createUserTrigger: `
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  `,
  enableRLS: `
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
  `,
  createRLSPolicies: `
    -- Profiles
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    CREATE POLICY "Users can view their own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    CREATE POLICY "Users can update their own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
    -- Admin policies
    ${adminTables.map(adminPolicySql).join('')}
    -- App settings policies - allow read access for all authenticated users
    DROP POLICY IF EXISTS "Allow read access to app settings" ON public.app_settings;
    CREATE POLICY "Allow read access to app settings" ON public.app_settings
      FOR SELECT USING (true);
  `,
  createAvatarsBucket: `
    INSERT INTO storage.buckets (id, name, public, avif_autodetection)
    VALUES ('avatars', 'avatars', true, false)
    ON CONFLICT (id) DO NOTHING;
  `,
  createAvatarsRLSPolicies,
};

export const getAllInitScripts = () => Object.values(initScripts);
