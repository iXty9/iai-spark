
export interface AppSettings {
  key: string;
  value: string;
  app_name?: string;
  site_title?: string;
  avatar_url?: string;
  default_theme_settings?: any;
}

export type SettingValueType = string | boolean | number | Record<string, any> | null;

export interface GeneralSetting {
  key: string;
  value: SettingValueType;
  description?: string;
  category?: string;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WebhookSettings {
  id?: string;
  url: string;
  secret?: string;
  is_active: boolean;
  events: string[];
  created_at?: string;
  updated_at?: string;
}

export enum WebhookEvent {
  MESSAGE_CREATED = 'message.created',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  SESSION_CREATED = 'session.created',
  SESSION_DELETED = 'session.deleted'
}
