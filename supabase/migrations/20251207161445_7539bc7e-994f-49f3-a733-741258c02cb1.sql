-- Add server-side file restrictions to the avatars storage bucket
-- This prevents bypass of client-side validation via direct API calls

UPDATE storage.buckets 
SET 
  file_size_limit = 5242880,  -- 5MB limit
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
WHERE name = 'avatars';