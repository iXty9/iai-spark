-- Add unique constraint to prevent duplicate notifications
-- First, add a computed column for notification_id
ALTER TABLE public.user_notifications 
ADD COLUMN notification_id_extracted TEXT 
GENERATED ALWAYS AS (metadata->>'notification_id') STORED;

-- Create unique constraint using the computed column
ALTER TABLE public.user_notifications 
ADD CONSTRAINT unique_user_notification 
UNIQUE (user_id, notification_id_extracted);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id 
ON public.user_notifications (user_id, notification_id_extracted);