-- Create deduplication table for GHL webhooks
CREATE TABLE public.ghl_webhook_dedup (
  webhook_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX idx_ghl_webhook_dedup_created_at ON public.ghl_webhook_dedup(created_at);

-- Enable RLS (service role only access)
ALTER TABLE public.ghl_webhook_dedup ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup function: remove entries older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_dedup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ghl_webhook_dedup WHERE created_at < NOW() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$;

-- Trigger cleanup after each insert
CREATE TRIGGER trigger_cleanup_webhook_dedup
AFTER INSERT ON public.ghl_webhook_dedup
EXECUTE FUNCTION public.cleanup_old_webhook_dedup();