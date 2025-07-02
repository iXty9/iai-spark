-- Create user_notifications table for notification center
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  sender TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB,
  source TEXT DEFAULT 'websocket'
);

-- Enable Row Level Security
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.user_notifications 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications for users" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_user_notifications_user_id_created_at ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX idx_user_notifications_read_at ON public.user_notifications(user_id, read_at) WHERE read_at IS NULL;

-- Create function to auto-cleanup old notifications (keep last 25 per user)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old notifications for this user, keeping only the latest 25
  DELETE FROM public.user_notifications 
  WHERE user_id = NEW.user_id 
    AND id NOT IN (
      SELECT id 
      FROM public.user_notifications 
      WHERE user_id = NEW.user_id 
      ORDER BY created_at DESC 
      LIMIT 25
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-cleanup
CREATE TRIGGER trigger_cleanup_old_notifications
  AFTER INSERT ON public.user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_notifications();