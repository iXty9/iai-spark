
-- Add new webhook URL settings for thumbs up/down feedback
INSERT INTO public.app_settings (key, value) 
VALUES 
  ('thumbs_up_webhook_url', 'https://n8n.ixty.ai:5679/webhook/d7a45640-thumbs-up'),
  ('thumbs_down_webhook_url', 'https://n8n.ixty.ai:5679/webhook/d7a45640-thumbs-down')
ON CONFLICT (key) DO NOTHING;
