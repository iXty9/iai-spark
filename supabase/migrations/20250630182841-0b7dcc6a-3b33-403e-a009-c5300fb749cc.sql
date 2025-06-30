
-- Add the new toast notification webhook URL to app_settings
-- This will be configurable in the admin panel
INSERT INTO app_settings (key, value) 
VALUES ('toast_notification_webhook_url', '') 
ON CONFLICT (key) DO NOTHING;
