-- Add 'pending' status to ghl_connection_status enum
ALTER TYPE public.ghl_connection_status ADD VALUE IF NOT EXISTS 'pending';

-- Make user_id nullable for pending installations (before user links account)
ALTER TABLE public.ghl_installations ALTER COLUMN user_id DROP NOT NULL;

-- Add unique constraint on location_id for pending installation matching
CREATE UNIQUE INDEX IF NOT EXISTS idx_ghl_installations_location_id 
ON public.ghl_installations(location_id) 
WHERE location_id IS NOT NULL;

-- Allow edge functions to insert pending installations (service role)
-- No RLS policy needed since service role bypasses RLS