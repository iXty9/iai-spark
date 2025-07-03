export interface SoundSettings {
  id?: string;
  user_id: string;
  toast_notification_sound?: string;
  chat_message_sound?: string;
  sounds_enabled: boolean;
  volume: number;
  created_at?: string;
  updated_at?: string;
}

export interface SoundFile {
  name: string;
  url: string;
  type: 'toast_notification' | 'chat_message';
}

export interface SoundUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export type SoundType = 'toast_notification' | 'chat_message';

export interface DefaultSoundSettings {
  toast_notification_sound?: string;
  chat_message_sound?: string;
  sounds_enabled: boolean;
  volume: number;
}