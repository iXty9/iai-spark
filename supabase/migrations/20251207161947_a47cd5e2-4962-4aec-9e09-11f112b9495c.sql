-- Remove the hardcoded default webhook URL from profiles table
-- This prevents exposure of internal n8n infrastructure in schema dumps

-- Remove the default value from the column
ALTER TABLE public.profiles 
ALTER COLUMN webhook_url DROP DEFAULT;

-- Clear existing rows that still have the old default value
UPDATE public.profiles 
SET webhook_url = NULL 
WHERE webhook_url = 'https://n8n.ixty.ai:5679/webhook/a7048654-0b16-4666-a3dd-9553f3d36574';