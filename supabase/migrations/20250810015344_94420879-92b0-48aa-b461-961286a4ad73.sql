-- Add privacy preference columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_use_coarse boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_include_address boolean DEFAULT true;

-- Optional: index for frequent reads
CREATE INDEX IF NOT EXISTS idx_profiles_location_prefs
  ON public.profiles (location_use_coarse, location_include_address);
