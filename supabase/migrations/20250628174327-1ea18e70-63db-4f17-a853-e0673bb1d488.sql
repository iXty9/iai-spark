
-- Add WebSocket configuration settings to app_settings table
INSERT INTO public.app_settings (key, value) 
VALUES 
  ('websocket_enabled', 'false'),
  ('proactive_message_webhook_url', '')
ON CONFLICT (key) DO NOTHING;
