-- Change message_id column from uuid to text to support both UUID (user messages) and msg_* format (AI messages)
ALTER TABLE public.active_chat_messages 
ALTER COLUMN message_id TYPE text USING message_id::text;