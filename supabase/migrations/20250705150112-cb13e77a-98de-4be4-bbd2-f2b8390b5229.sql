-- Add PWA settings to app_settings table
-- These settings will control the PWA manifest generation

INSERT INTO app_settings (key, value) VALUES 
  ('pwa_app_name', 'Ixty AI - The Everywhere Intelligent Assistant'),
  ('pwa_short_name', 'Ixty AI'),
  ('pwa_description', 'Chat with Ixty AI, the productive AI assistant from iXty9!'),
  ('pwa_theme_color', '#dd3333'),
  ('pwa_background_color', '#ffffff'),
  ('pwa_display_mode', 'standalone'),
  ('pwa_orientation', 'portrait-primary'),
  ('pwa_start_url', '/'),
  ('pwa_scope', '/'),
  ('pwa_categories', '["productivity", "business", "utilities"]'),
  ('pwa_lang', 'en'),
  ('pwa_icon_url', 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png'),
  ('pwa_maskable_icon_url', ''),
  ('pwa_cache_strategy', 'cache-first'),
  ('pwa_offline_fallback', 'true')
ON CONFLICT (key) DO NOTHING;