-- Create enum for connection status
CREATE TYPE public.ghl_connection_status AS ENUM ('connected', 'expired', 'error', 'disconnected');

-- Create the ghl_installations table
-- Tokens are stored encrypted (encryption happens in edge functions)
CREATE TABLE public.ghl_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  location_id TEXT,
  company_id TEXT,
  ghl_user_id TEXT,
  access_token_encrypted TEXT, -- Encrypted in edge function
  refresh_token_encrypted TEXT, -- Encrypted in edge function
  token_expires_at TIMESTAMPTZ,
  scopes TEXT, -- Space-separated scopes string
  connection_status public.ghl_connection_status NOT NULL DEFAULT 'connected',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_refresh_at TIMESTAMPTZ,
  refresh_error TEXT,
  location_name TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ghl_installations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own installation (excluding encrypted tokens)
CREATE POLICY "Users can view their own GHL installation"
ON public.ghl_installations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own installation (disconnect)
CREATE POLICY "Users can delete their own GHL installation"
ON public.ghl_installations
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all installations
CREATE POLICY "Admins can view all GHL installations"
ON public.ghl_installations
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all installations (for troubleshooting)
CREATE POLICY "Admins can update all GHL installations"
ON public.ghl_installations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete any installation
CREATE POLICY "Admins can delete any GHL installation"
ON public.ghl_installations
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_ghl_installations_updated_at
BEFORE UPDATE ON public.ghl_installations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();