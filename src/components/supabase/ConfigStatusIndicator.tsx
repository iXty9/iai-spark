import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { hasValidConfiguration } from '@/utils/config-generator';
import { fetchStaticSiteConfig, readConfigFromLocalStorage, getConfigFromEnvironment } from '@/services/site-config/site-config-file-service';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConfigStatusIndicatorProps {
  onConfigureClick?: () => void;
}

export function ConfigStatusIndicator({ onConfigureClick }: ConfigStatusIndicatorProps) {
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [sources, setSources] = useState<{
    staticFile: boolean;
    localStorage: boolean;
    environment: boolean;
  }>({
    staticFile: false,
    localStorage: false,
    environment: false,
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkConfiguration = async () => {
    setIsChecking(true);
    
    // Check all possible sources
    const staticConfig = await fetchStaticSiteConfig();
    const localConfig = readConfigFromLocalStorage();
    const envConfig = getConfigFromEnvironment();
    
    setSources({
      staticFile: !!staticConfig,
      localStorage: !!localConfig,
      environment: !!envConfig,
    });
    
    // If any source is valid, the configuration is valid
    setStatus(staticConfig || localConfig || envConfig ? 'valid' : 'invalid');
    setIsChecking(false);
  };

  useEffect(() => {
    checkConfiguration();
  }, []);

  return (
    <div className="mb-4">
      {status === 'checking' || isChecking ? (
        <Alert className="bg-yellow-50 border-yellow-200">
          <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
          <AlertTitle>Checking Configuration</AlertTitle>
          <AlertDescription>
            Verifying Supabase connection settings...
          </AlertDescription>
        </Alert>
      ) : status === 'valid' ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Configuration Valid</AlertTitle>
          <AlertDescription className="flex flex-col gap-1">
            <span>Supabase connection is properly configured.</span>
            <div className="text-xs text-gray-500 mt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <span className={`w-2 h-2 rounded-full ${sources.staticFile ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Static Config File</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{sources.staticFile ? 'Found valid configuration in site-config.json' : 'No valid configuration in site-config.json'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <span className={`w-2 h-2 rounded-full ${sources.localStorage ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Browser Storage</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{sources.localStorage ? 'Found valid configuration in localStorage' : 'No valid configuration in localStorage'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <span className={`w-2 h-2 rounded-full ${sources.environment ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Environment Variables</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{sources.environment ? 'Found valid configuration in environment variables' : 'No valid configuration in environment variables'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkConfiguration}
                disabled={isChecking}
                className="text-xs"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertTitle>Configuration Missing</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>No valid Supabase connection configuration found.</span>
            <div className="text-sm">
              <p>The application needs Supabase connection details to function properly.</p>
              <p className="mt-1">Possible solutions:</p>
              <ul className="list-disc pl-5 mt-1 text-xs">
                <li>Create a <code>site-config.json</code> file in the public directory</li>
                <li>Add environment variables in your <code>.env</code> file</li>
                <li>Configure the connection manually</li>
              </ul>
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
                onClick={checkConfiguration}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Check Again
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
