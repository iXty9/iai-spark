/**
 * Admin-related type definitions
 */

export interface ConnectionStatus {
  isConnected: boolean;
  environment: string;
  lastChecked: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface AppSettings {
  app_name?: string;
  site_title?: string;
  default_theme_settings?: string;
  [key: string]: string | undefined;
}

export interface AdminConfig {
  email: string;
  password: string;
  username: string;
}

export interface DatabaseSetupResult {
  success: boolean;
  message: string;
  error?: string;
}