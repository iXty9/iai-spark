-- Create active_chat_messages table for real-time synced chat
CREATE TABLE public.active_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid NOT NULL,  -- Client-generated UUID for deduplication
  sender text NOT NULL CHECK (sender IN ('user', 'ai')),
  content text NOT NULL,
  timestamp timestamptz NOT NULL,
  source text,  -- 'user', 'ai', 'proactive'
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate messages from multiple instances
  UNIQUE (user_id, message_id)
);

-- Index for efficient queries
CREATE INDEX idx_active_chat_user_timestamp ON public.active_chat_messages(user_id, timestamp);

-- Enable realtime with full row data
ALTER TABLE public.active_chat_messages REPLICA IDENTITY FULL;

-- Enable Row Level Security
ALTER TABLE public.active_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own messages
CREATE POLICY "Users can view own active messages"
  ON public.active_chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own active messages"
  ON public.active_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own active messages"
  ON public.active_chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger function to enforce 100 message limit per user
CREATE OR REPLACE FUNCTION public.enforce_active_chat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  message_count integer;
  excess_count integer;
BEGIN
  -- Count current messages for this user
  SELECT COUNT(*) INTO message_count
  FROM public.active_chat_messages
  WHERE user_id = NEW.user_id;
  
  -- If we exceed 100, delete oldest messages
  IF message_count > 100 THEN
    excess_count := message_count - 100;
    
    DELETE FROM public.active_chat_messages
    WHERE id IN (
      SELECT id FROM public.active_chat_messages
      WHERE user_id = NEW.user_id
      ORDER BY timestamp ASC
      LIMIT excess_count
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after insert
CREATE TRIGGER trigger_enforce_active_chat_limit
  AFTER INSERT ON public.active_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_chat_limit();

-- Add to supabase_realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_chat_messages;