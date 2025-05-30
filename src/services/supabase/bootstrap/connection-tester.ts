
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logging';
import type { ConnectionTestResult } from './types';

/**
 * Test if we have connection to Supabase with the provided credentials
 */
export async function testBootstrapConnection(
  url: string, 
  anonKey: string
): Promise<ConnectionTestResult> {
  try {
    if (!url || !anonKey) {
      return {
        isConnected: false,
        hasPermissions: false,
        error: 'Missing URL or API key',
        errorCode: 'missing_credentials'
      };
    }
    
    logger.info('Testing bootstrap connection', { 
      module: 'bootstrap-connection',
      url: url.split('//')[1]
    });
    
    const testClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Try to make a simple query to test the connection
    const { error: connectionError } = await testClient
      .from('app_settings')
      .select('key')
      .limit(1);
    
    // Connection is good if there's no error or if it's just a "table not found" error
    const isConnected = !connectionError || connectionError.code === '42P01';
    
    if (!isConnected) {
      logger.warn('Bootstrap connection test failed', { 
        module: 'bootstrap-connection',
        url: url.split('//')[1],
        errorCode: connectionError?.code
      });
      
      return {
        isConnected: false,
        hasPermissions: false,
        error: connectionError?.message || 'Unknown connection error',
        errorCode: connectionError?.code
      };
    }
    
    logger.info('Bootstrap connection test successful', { 
      module: 'bootstrap-connection',
      url: url.split('//')[1]
    });
    
    // Test permissions by trying to create a temporary table
    try {
      const { error: permissionError } = await testClient.rpc('test_permissions', {});
      
      const hasPermissions = !permissionError;
      
      if (!hasPermissions) {
        logger.warn('Bootstrap permission test failed', {
          module: 'bootstrap-connection',
          url: url.split('//')[1],
          errorCode: permissionError?.code
        });
        
        return {
          isConnected: true,
          hasPermissions: false,
          error: permissionError?.message || 'Permission test failed',
          errorCode: permissionError?.code
        };
      }
      
      logger.info('Bootstrap permission test successful', {
        module: 'bootstrap-connection',
        url: url.split('//')[1]
      });
      
      return {
        isConnected: true,
        hasPermissions: true
      };
      
    } catch (permError) {
      // If the RPC doesn't exist yet, that's expected during initial setup
      logger.info('Permission test RPC not available, connection successful', {
        module: 'bootstrap-connection',
        url: url.split('//')[1]
      });
      
      return {
        isConnected: true,
        hasPermissions: false,
        error: 'Permission test not available',
        errorCode: 'rpc_not_found'
      };
    }
    
  } catch (error) {
    logger.error('Error testing bootstrap connection', error, { module: 'bootstrap-connection' });
    
    // Categorize network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        isConnected: false,
        hasPermissions: false,
        error: 'Network error connecting to Supabase',
        errorCode: 'network_error'
      };
    }
    
    // Handle CORS errors
    if (error.message && error.message.includes('CORS')) {
      return {
        isConnected: false,
        hasPermissions: false,
        error: 'CORS policy blocked connection to Supabase',
        errorCode: 'cors_error'
      };
    }
    
    return {
      isConnected: false,
      hasPermissions: false,
      error: error instanceof Error ? error.message : String(error),
      errorCode: 'unexpected_error'
    };
  }
}
