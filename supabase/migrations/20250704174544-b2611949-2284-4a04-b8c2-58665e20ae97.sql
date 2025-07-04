-- Add authentication settings to app_settings table
INSERT INTO public.app_settings (key, value) VALUES
  ('auth_tagline', 'Intelligent Conversations'),
  ('auth_welcome_description', 'Welcome back! Sign in to continue your intelligent conversations or create a new account to get started.'),
  ('auth_login_title', 'Sign In'),
  ('auth_login_description', 'Enter your credentials to access your account and continue your conversations.'),
  ('auth_register_title', 'Create Account'),
  ('auth_register_description', 'Join Ixty AI to start your intelligent conversation journey. Fill in your details below to get started.'),
  ('auth_disclaimer_text', 'I agree to terms & conditions provided by the company. By providing my phone number, I agree to receive text messages from IXTY9 LLC.'),
  ('auth_disclaimer_required', 'true')
ON CONFLICT (key) DO NOTHING;