
// Types for settings service

export interface AppSettings {
  app_name?: string;
  site_title?: string;
  default_theme_settings?: string;
  [key: string]: string | undefined;
}

export interface ConnectionConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  isInitialized: boolean;
  lastConnection?: string;
}
