
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string; // Added for self-healing operations
  isInitialized: boolean;
  savedAt?: string; // Timestamp when config was saved
  environment?: string; // Which environment this config was saved from
}
