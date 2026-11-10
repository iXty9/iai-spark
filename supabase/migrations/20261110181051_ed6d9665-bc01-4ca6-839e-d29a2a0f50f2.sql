CREATE TABLE public.hermes_conversations (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  generation integer NOT NULL DEFAULT 1,
  conversation_token uuid NOT NULL DEFAULT gen_random_uuid(),
  hermes_session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.hermes_conversations TO service_role;
ALTER TABLE public.hermes_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.hermes_turns (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generation integer NOT NULL,
  client_message_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reply text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, generation, client_message_id)
);
GRANT ALL ON public.hermes_turns TO service_role;
ALTER TABLE public.hermes_turns ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_hermes_turn_status() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending','completed','failed','uncertain') THEN
    RAISE EXCEPTION 'invalid hermes turn status %', NEW.status;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER hermes_turns_validate BEFORE INSERT OR UPDATE ON public.hermes_turns
FOR EACH ROW EXECUTE FUNCTION public.validate_hermes_turn_status();
CREATE TRIGGER hermes_conversations_updated BEFORE UPDATE ON public.hermes_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value)
SELECT 'hermes_session_continuity_enabled', 'false'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'hermes_session_continuity_enabled');