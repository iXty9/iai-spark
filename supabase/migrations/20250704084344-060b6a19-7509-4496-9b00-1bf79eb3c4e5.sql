-- Fix storage bucket CORS and public access for sounds
UPDATE storage.buckets 
SET public = true 
WHERE id = 'sounds';

-- Create storage policies for sounds bucket
CREATE POLICY "Public sounds access for authenticated users" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sounds' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload their own sounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'sounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own sounds" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'sounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own sounds" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'sounds' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);