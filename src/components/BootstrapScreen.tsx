
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface BootstrapScreenProps {
  state: string;
  error?: any;
  onRetry?: () => void;
}

export const BootstrapScreen = ({ state, error, onRetry }: BootstrapScreenProps) => {
  // Function to get appropriate message based on the state
  const getStateMessage = (state: string) => {
    switch (state) {
      case 'initial':
        return 'Initializing application...';
      case 'loading':
        return 'Loading configuration...';
      case 'config_found':
        return 'Configuration found, establishing connection...';
      case 'config_missing':
        return 'Configuration not found, redirecting to setup...';
      case 'connection_error':
        return 'Connection failed, please check your settings.';
      case 'connection_success':
        return 'Connection successful, loading application...';
      case 'complete':
        return 'Bootstrap complete, launching application...';
      default:
        return `Current state: ${state}`;
    }
  };

  // Extract error message
  const errorMessage = error ? (typeof error === 'string' ? error : 
                               (error.message || JSON.stringify(error))) : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 max-w-md w-full p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold">Application Bootstrap</h1>
        <div className="text-left space-y-3">
          <p>{getStateMessage(state)}</p>
          
          {/* Show a loading indicator for states that are still processing */}
          {['initial', 'loading', 'config_found', 'connection_success'].includes(state) && (
            <div className="flex justify-center my-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          
          {/* Show error details if present */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
              <h3 className="font-bold">Error</h3>
              <p className="break-words text-sm">{errorMessage}</p>
              
              {/* Technical details for debugging */}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs">Technical details</summary>
                <pre className="text-xs mt-2 p-2 bg-red-50 overflow-auto max-h-40">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            </div>
          )}
          
          {/* Retry button for error states */}
          {['connection_error', 'config_missing'].includes(state) && onRetry && (
            <div className="mt-4 flex justify-center">
              <Button 
                onClick={onRetry} 
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Connection
              </Button>
            </div>
          )}
          
          {/* Add bypass option */}
          {['connection_error', 'config_missing'].includes(state) && (
            <div className="mt-4 text-center">
              <a 
                href="/?bypass_bootstrap=true" 
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Bypass bootstrap and continue to application
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
