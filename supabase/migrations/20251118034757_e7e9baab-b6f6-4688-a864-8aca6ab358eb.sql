-- Update the validate_webhook_url function to support port numbers
CREATE OR REPLACE FUNCTION public.validate_webhook_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate webhook URL format and restrict to safe domains
  IF NEW.webhook_url IS NOT NULL AND NEW.webhook_url != '' THEN
    -- Basic URL validation - now supports port numbers
    IF NEW.webhook_url !~ '^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$' THEN
      RAISE EXCEPTION 'Invalid webhook URL format. Must be a valid HTTP/HTTPS URL.';
    END IF;
    
    -- Prevent localhost and internal IP addresses for security
    IF NEW.webhook_url ~* '(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' THEN
      RAISE EXCEPTION 'Webhook URL cannot point to localhost or internal IP addresses.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;