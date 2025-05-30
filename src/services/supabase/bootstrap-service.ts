
/**
 * Bootstrap service for initial Supabase connection
 * This service is specifically designed to avoid circular dependencies.
 * It provides minimal functionality to retrieve connection settings
 * without relying on the main Supabase client.
 */

export { fetchBootstrapConfig } from './bootstrap/config-fetcher';
export { testBootstrapConnection } from './bootstrap/connection-tester';
export type { ConnectionConfig, ConnectionTestResult, BootstrapConfigResult } from './bootstrap/types';
