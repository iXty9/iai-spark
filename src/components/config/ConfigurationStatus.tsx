
import React from 'react';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useConfiguration } from '@/hooks/useConfiguration';

interface ConfigurationStatusProps {
  onConfigureClick?: () => void;
}

/**
 * Simplified configuration status component
 * Replaces ConfigStatusIndicator with cleaner implementation
 */
export function ConfigurationStatus({ onConfigureClick }: ConfigurationStatusProps) {
  const { config, isLoading, error, isInitialized, reload } = useConfiguration();

  if (isLoading) {
    return (
      <Alert className="bg-yellow-50 border-yellow-200">
        <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
        <AlertTitle>Checking Configuration</AlertTitle>
        <AlertDescription>
          Loading application configuration...
        </AlertDescription>
      </Alert>
    );
  }

  if (isInitialized && config) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle>Configuration Ready</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>Application is properly configured and ready to use.</span>
          <div className="text-xs text-gray-600">
            <div>URL: {config.supabaseUrl.replace(/^https?:\/\//, '').substring(0, 30)}...</div>
            {config.lastUpdated && (
              <div>Updated: {new Date(config.lastUpdated).toLocaleDateString()}</div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={reload}
            className="w-fit mt-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-red-50 border-red-200">
      <AlertCircle className="h-4 w-4 text-red-500" />
      <AlertTitle>Configuration Required</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{error || 'Application configuration is missing or invalid.'}</span>
        <div className="text-sm">
          <p>Please configure your Supabase connection to continue.</p>
        </div>
        <div className="flex gap-2 mt-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={onConfigureClick}
          >
            Configure Now
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={reload}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Check Again
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
