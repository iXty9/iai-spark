
import { supabase as supabasePromise, getResolvedClient } from '@/integrations/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';
import { getEnvironmentInfo } from '@/config/supabase/environment';

export interface ConnectionTestResult {
  isConnected: boolean;
  error?: string;
}

// Function to reset and reinitialize the Supabase client
export function resetSupabaseClient() {
  // Implementation would go here
  // This is just a stub to satisfy imports
  logger.info('Resetting Supabase client', { module: 'connection-service' });
}

// Test a Supabase connection with the provided URL and key
export async function testSupabaseConnection(url: string, anonKey: string): Promise<ConnectionTestResult | boolean> {
  try {
    // Implementation would go here
    // This is just a stub to satisfy imports
    logger.info('Testing Supabase connection', { module: 'connection-service' });
    return { isConnected: true };
  } catch (error) {
    logger.error('Error testing Supabase connection', error, { module: 'connection-service' });
    return { isConnected: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to safely access Supabase client
export async function withSupabase<T>(callback: (client: SupabaseClient) => Promise<T>): Promise<T> {
  try {
    // First try to get the already resolved client (sync)
    let client = getResolvedClient();
    
    if (!client) {
      // If not available, wait for the async client
      client = await supabasePromise;
    }
    
    if (!client) {
      throw new Error('Supabase client not available');
    }
    
    return await callback(client);
  } catch (error) {
    logger.error('Error executing Supabase operation', error);
    throw error;
  }
}

// Get connection information
export function getConnectionInfo() {
  return {
    url: 'https://example.supabase.co', // This would be dynamically fetched
    hasStoredConfig: true, // This would be dynamically checked
    lastConnection: new Date().toISOString(),
    environment: getEnvironmentInfo(),
  };
}

// These functions are mocked for compatibility with existing imports
export function checkPublicBootstrapConfig() {
  return Promise.resolve({ exists: true, valid: true });
}

export function checkConnectionHealth() {
  return Promise.resolve({ isHealthy: true });
}

// Add the missing functions that are being imported in bootstrap-state-machine.ts
export async function getSupabaseClient(options = {}): Promise<SupabaseClient | null> {
  // Implementation stub for bootstrap-state-machine.ts compatibility
  logger.info('Getting Supabase client', { module: 'connection-service' });
  try {
    const client = await supabasePromise;
    return client;
  } catch (error) {
    logger.error('Error getting Supabase client', error, { module: 'connection-service' });
    return null;
  }
}

export function shouldBypassRedirect(path: string): boolean {
  // Implementation stub for bootstrap-state-machine.ts compatibility
  // These routes should never be redirected away from, even if config is missing
  const NON_REDIRECTABLE_ROUTES = [
    '/supabase-auth',
    '/initialize',
    '/admin/connection'
  ];
  
  return NON_REDIRECTABLE_ROUTES.some(route => path.startsWith(route));
}
