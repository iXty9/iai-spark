-- Add unique constraint to prevent duplicate notifications
-- This ensures each user gets only one notification per unique notification_id
ALTER TABLE public.user_notifications 
ADD CONSTRAINT unique_user_notification 
UNIQUE (user_id, (metadata->>'notification_id'));

-- Create index for better performance on notification lookups
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id 
ON public.user_notifications USING btree (user_id, (metadata->>'notification_id'));