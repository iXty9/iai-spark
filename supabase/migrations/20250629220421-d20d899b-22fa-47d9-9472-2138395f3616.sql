
-- Add SEO settings to the app_settings table
INSERT INTO public.app_settings (key, value) 
VALUES 
  ('seo_site_title', 'Ixty AI - "The Everywhere Intelligent Assistant"'),
  ('seo_site_description', 'Chat with Ixty AI, the productive AI assistant from iXty9!'),
  ('seo_site_author', 'Ixty AI'),
  ('seo_og_image_url', 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png'),
  ('seo_twitter_handle', 'ixty_ai'),
  ('seo_favicon_url', 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png'),
  ('seo_og_type', 'website')
ON CONFLICT (key) DO NOTHING;
