-- Add unique constraint on location_id to support upsert by location
-- This prevents duplicate installations for the same GHL location
ALTER TABLE ghl_installations 
ADD CONSTRAINT ghl_installations_location_id_unique UNIQUE (location_id);