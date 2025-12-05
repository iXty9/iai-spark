-- Add custom webhook columns to profiles table for per-user webhook configuration
-- The existing webhook_url column will be repurposed as the custom webhook URL

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS custom_webhook_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_webhook_auth_header_name text,
ADD COLUMN IF NOT EXISTS custom_webhook_auth_header_value text,
ADD COLUMN IF NOT EXISTS custom_webhook_use_auth boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.custom_webhook_enabled IS 'When true, use custom webhook_url instead of global authenticated webhook';
COMMENT ON COLUMN public.profiles.webhook_url IS 'Custom authenticated webhook URL for this user (admin-set only)';
COMMENT ON COLUMN public.profiles.custom_webhook_auth_header_name IS 'Custom auth header name for user webhook';
COMMENT ON COLUMN public.profiles.custom_webhook_auth_header_value IS 'Custom auth header value for user webhook';
COMMENT ON COLUMN public.profiles.custom_webhook_use_auth IS 'Whether to use auth header for custom webhook';