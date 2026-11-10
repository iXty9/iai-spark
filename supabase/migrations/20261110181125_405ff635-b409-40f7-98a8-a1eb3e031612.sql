REVOKE ALL ON public.hermes_conversations FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.hermes_turns FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_hermes_turn_status() FROM anon, authenticated, PUBLIC;