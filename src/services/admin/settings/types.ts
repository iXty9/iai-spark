
export interface AppSettings {
  app_name: string;
  site_title: string;
  app_description?: string;
  primary_color?: string;
  accent_color?: string;
  allow_signups?: boolean;
  require_email_verification?: boolean;
  max_upload_size_mb?: number;
  ga_tracking_id?: string;
  enable_social_login?: boolean;
  favicon_url?: string;
  logo_url?: string;
  avatar_url?: string;
  default_theme_settings?: string;
  // Legacy keys
  key?: string;
  value?: string;
  [key: string]: any;
}

export interface ConnectionSettings {
  url: string;
  anonKey: string;
  serviceKey?: string;
  lastConnection?: string;
  isInitialized?: boolean;
  createdAt?: string;
  updatedAt?: string;
  environment?: string;
  [key: string]: any;
}

export interface WebhookSettings {
  enabled: boolean;
  url: string;
  secret?: string;
  events?: string[];
  headers?: Record<string, string>;
  retries?: number;
  timeout_ms?: number;
}

export type AdminSettingsKey = 'app' | 'connection' | 'webhooks';

export interface ConnectionConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  lastConnection?: string;
}
