-- Enable real-time updates for profiles table to support cross-browser theme sync
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add the profiles table to the realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END $$;