CREATE OR REPLACE FUNCTION public.hermes_finish_turn(p_user uuid, p_generation int, p_token uuid, p_msg uuid, p_status text, p_reply text, p_error text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur record;
BEGIN
  SELECT generation, conversation_token INTO cur FROM public.hermes_conversations WHERE user_id = p_user FOR UPDATE;
  IF NOT FOUND OR cur.generation <> p_generation OR cur.conversation_token <> p_token THEN
    UPDATE public.hermes_turns SET status = 'failed', reply = NULL, error_code = 'stale_generation'
      WHERE user_id = p_user AND generation = p_generation AND client_message_id = p_msg;
    RETURN false;
  END IF;
  UPDATE public.hermes_turns SET status = p_status, reply = p_reply, error_code = p_error
    WHERE user_id = p_user AND generation = p_generation AND client_message_id = p_msg;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.hermes_finish_turn(uuid,int,uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hermes_finish_turn(uuid,int,uuid,uuid,text,text,text) TO service_role;