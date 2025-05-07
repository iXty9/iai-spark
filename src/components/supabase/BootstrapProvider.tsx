
import React, { useEffect, useState } from 'react';
import { checkPublicBootstrapConfig } from '@/services/supabase/connection-service';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logging';

interface BootstrapProviderProps {
  children: React.ReactNode;
}

export function BootstrapProvider({ children }: BootstrapProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [bootstrapFailed, setBootstrapFailed] = useState(false);
  const [isBootstrappedFromSiteConfig, setIsBootstrappedFromSiteConfig] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Try to bootstrap connection from URL params, site config, or defaults
    const bootstrapConnection = async () => {
      try {
        // This checks for bootstrap config and applies it if found
        const success = await checkPublicBootstrapConfig();
        
        if (success) {
          logger.info('Bootstrap succeeded from shared config or site environment', {
            module: 'bootstrap-provider'
          });
          setIsBootstrappedFromSiteConfig(true);
        } else {
          logger.info('No bootstrap configuration found, proceeding with normal flow', {
            module: 'bootstrap-provider'
          });
        }
      } catch (error) {
        logger.error('Error during bootstrap:', error, {
          module: 'bootstrap-provider'
        });
        setBootstrapFailed(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    bootstrapConnection();
  }, []);
  
  // Handle reconnect action
  const handleReconnect = () => {
    navigate('/supabase-auth');
  };
  
  // Show loading state while bootstrapping
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p>Checking connection configuration...</p>
        </div>
      </div>
    );
  }
  
  // Show error if bootstrap failed
  if (bootstrapFailed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              Could not establish connection to the database. This may be because this is your first 
              visit from this device or the connection settings have changed.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleReconnect} 
            className="w-full"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Connect to Database
          </Button>
        </div>
      </div>
    );
  }

  // Show success message if bootstrapped from site configuration
  if (isBootstrappedFromSiteConfig) {
    // Use setTimeout to show the success message briefly before continuing
    setTimeout(() => {
      setIsBootstrappedFromSiteConfig(false);
    }, 1500);
    
    return (
      <div className="fixed bottom-4 right-4 max-w-sm z-50">
        <Alert className="bg-green-50 border-green-200 text-green-800 shadow-lg">
          <Info className="h-4 w-4 text-green-500" />
          <AlertTitle>Auto-connected</AlertTitle>
          <AlertDescription>
            Successfully connected using site configuration
          </AlertDescription>
        </Alert>
        <div className="mt-2">
          {children}
        </div>
      </div>
    );
  }
  
  // Render children if bootstrap succeeded or wasn't needed
  return <>{children}</>;
}
