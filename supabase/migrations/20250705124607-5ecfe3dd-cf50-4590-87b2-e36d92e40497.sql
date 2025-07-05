-- Add location fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN location_latitude DECIMAL(10, 8),
ADD COLUMN location_longitude DECIMAL(11, 8),
ADD COLUMN location_address TEXT,
ADD COLUMN location_city TEXT,
ADD COLUMN location_country TEXT,
ADD COLUMN location_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN location_permission_granted BOOLEAN DEFAULT FALSE,
ADD COLUMN location_auto_update BOOLEAN DEFAULT TRUE;