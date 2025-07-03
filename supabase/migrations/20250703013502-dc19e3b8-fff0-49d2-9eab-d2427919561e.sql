-- Create sounds storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('sounds', 'sounds', false);

-- Create storage policies for sounds bucket
CREATE POLICY "Users can view their own sounds" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own sounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'sounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own sounds" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'sounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own sounds" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'sounds' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create sound_settings table
CREATE TABLE public.sound_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  toast_notification_sound TEXT,
  chat_message_sound TEXT,
  sounds_enabled BOOLEAN NOT NULL DEFAULT true,
  volume REAL NOT NULL DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.sound_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for sound_settings
CREATE POLICY "Users can view their own sound settings" 
ON public.sound_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sound settings" 
ON public.sound_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sound settings" 
ON public.sound_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sound_settings_updated_at
BEFORE UPDATE ON public.sound_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();