
/**
 * Application constants
 * Centralized location for hardcoded values and configuration
 */

export const CONFIG_CONSTANTS = {
  BOOTSTRAP_STATE_KEY: 'supabase_bootstrap_state',
  ENVIRONMENT_KEY: 'supabase_environment_local',
  CONFIG_CACHE_DURATION: 3600000, // 1 hour
  MAX_RETRIES: 3,
  RETRY_DELAYS: [500, 1000, 2000],
  CONNECTION_TIMEOUT: 30000,
  LOG_THROTTLE_MS: 5000,
  MAX_SEEN_LOGS: 200,
  MAX_TIMESTAMPS: 100
} as const;

export const UI_CONSTANTS = {
  MAX_LOG_ENTRIES: 100,
  MAX_CONSOLE_ENTRIES: 50,
  CLEANUP_INTERVAL: 120000, // 2 minutes
  FPS_UPDATE_INTERVAL: 16, // ~60fps
  STORAGE_COLLECTION_INTERVAL: 30000
} as const;

export const API_CONSTANTS = {
  WEBHOOK_TIMEOUT: 30000,
  MAX_MESSAGE_LENGTH: 10000,
  RESPONSE_WARNING_THRESHOLD: 30000
} as const;
