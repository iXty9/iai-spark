
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ConnectionForm } from '@/components/init/ConnectionForm';
import { DatabaseSetupStep } from '@/components/init/DatabaseSetupStep';
import { AdminSetupForm } from '@/components/init/AdminSetupForm';
import { hasStoredConfig, isDevelopment, clearConfig, getEnvironmentInfo } from '@/config/supabase-config';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Database, ShieldCheck, Settings, Info, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { resetSupabaseClient, getConnectionInfo } from '@/services/supabase/connection-service';
import { logger } from '@/utils/logging';

// Initialize page steps
enum InitStep {
  Connection = 0,
  DatabaseSetup = 1,
  AdminSetup = 2,
  Complete = 3,
}

// Local storage key for initialization state
const INIT_STATE_KEY = 'initialization_state';

// Interface for persistent initialization state
interface InitializationState {
  step: InitStep;
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  timestamp: string;
  sessionId: string;
}

const Initialize = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Generate a unique session ID for this initialization process
  const [sessionId] = useState<string>(() => {
    return `init_${Math.random().toString(36).substring(2, 10)}`;
  });
  
  // Load saved state or use defaults
  const [currentStep, setCurrentStep] = useState<InitStep>(() => {
    try {
      const savedState = localStorage.getItem(INIT_STATE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState) as InitializationState;
        // Only use saved state if it's less than 24 hours old
        const savedTime = new Date(parsedState.timestamp).getTime();
        const now = new Date().getTime();
        const hoursSinceSaved = (now - savedTime) / (1000 * 60 * 60);
        
        if (hoursSinceSaved < 24) {
          return parsedState.step;
        }
      }
      return InitStep.Connection;
    } catch (e) {
      return InitStep.Connection;
    }
  });
  
  const [supabaseUrl, setSupabaseUrl] = useState<string>(() => {
    try {
      const savedState = localStorage.getItem(INIT_STATE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState) as InitializationState;
        return parsedState.supabaseUrl || '';
      }
      return '';
    } catch (e) {
      return '';
    }
  });
  
  const [anonKey, setAnonKey] = useState<string>(() => {
    try {
      const savedState = localStorage.getItem(INIT_STATE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState) as InitializationState;
        return parsedState.anonKey || '';
      }
      return '';
    } catch (e) {
      return '';
    }
  });
  
  const [serviceKey, setServiceKey] = useState<string>(() => {
    try {
      const savedState = localStorage.getItem(INIT_STATE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState) as InitializationState;
        return parsedState.serviceKey || '';
      }
      return '';
    } catch (e) {
      return '';
    }
  });
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(location.search);
  const forceInit = urlParams.get('force_init') === 'true';
  const resetConfig = urlParams.get('reset_config') === 'true';
  const resumeInit = urlParams.get('resume') === 'true';
  
  // Save state whenever it changes
  const saveState = useCallback(() => {
    try {
      const state: InitializationState = {
        step: currentStep,
        supabaseUrl,
        anonKey,
        serviceKey,
        timestamp: new Date().toISOString(),
        sessionId
      };
      
      localStorage.setItem(INIT_STATE_KEY, JSON.stringify(state));
      
      logger.info('Saved initialization state', {
        module: 'initialize',
        step: currentStep,
        sessionId
      });
    } catch (e) {
      logger.error('Failed to save initialization state', e, {
        module: 'initialize'
      });
    }
  }, [currentStep, supabaseUrl, anonKey, serviceKey, sessionId]);
  
  // Save state on changes
  useEffect(() => {
    saveState();
  }, [currentStep, supabaseUrl, anonKey, serviceKey, saveState]);
  
  // Check if already initialized
  useEffect(() => {
    if (resetConfig) {
      // Clear config, reset Supabase client, and reload with force_init parameter
      clearConfig();
      toast({
        title: 'Configuration Reset',
        description: 'The stored configuration has been cleared.',
      });
      
      // Use a slight delay before redirecting to ensure localStorage is updated
      setTimeout(() => {
        // Reload the page with force_init parameter
        navigate('/initialize?force_init=true', { replace: true });
      }, 100);
      return;
    }
    
    // Check for resume parameter
    if (resumeInit) {
      try {
        const savedState = localStorage.getItem(INIT_STATE_KEY);
        if (savedState) {
          const parsedState = JSON.parse(savedState) as InitializationState;
          // Only resume if state is less than 24 hours old
          const savedTime = new Date(parsedState.timestamp).getTime();
          const now = new Date().getTime();
          const hoursSinceSaved = (now - savedTime) / (1000 * 60 * 60);
          
          if (hoursSinceSaved < 24) {
            toast({
              title: 'Resuming Setup',
              description: `Continuing from step ${parsedState.step + 1} of 4.`,
            });
            return;
          }
        }
      } catch (e) {
        logger.error('Error resuming initialization', e, {
          module: 'initialize'
        });
      }
    }
    
    // Allow forcing the initialize page with force_init parameter
    if (!forceInit && !resumeInit && hasStoredConfig()) {
      toast({
        title: 'Already Configured',
        description: 'Supabase connection is already configured.',
      });
      navigate('/');
    }
  }, [navigate, forceInit, resetConfig, resumeInit]);
  
  // Handle successful connection setup
  const handleConnectionSuccess = (url: string, anon: string, service: string) => {
    setSupabaseUrl(url);
    setAnonKey(anon);
    setServiceKey(service);
    setCurrentStep(InitStep.DatabaseSetup);
    
    // Log the transition
    logger.info('Completed connection setup, moving to database setup', {
      module: 'initialize',
      sessionId
    });
  };
  
  // Handle successful database initialization
  const handleDatabaseSuccess = () => {
    setCurrentStep(InitStep.AdminSetup);
    
    // Log the transition
    logger.info('Completed database setup, moving to admin setup', {
      module: 'initialize',
      sessionId
    });
  };
  
  // Handle successful admin creation
  const handleAdminSuccess = () => {
    setCurrentStep(InitStep.Complete);
    
    // Clear initialization state
    localStorage.removeItem(INIT_STATE_KEY);
    
    toast({
      title: 'Setup Complete',
      description: 'Your application is now configured and ready to use.',
    });
    
    // Log the completion
    logger.info('Completed initialization process', {
      module: 'initialize',
      sessionId,
      environment: getEnvironmentInfo().id
    });
    
    // Redirect to home after a short delay
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };
  
  // Reset stored configuration with force_init parameter
  const handleResetConfig = () => {
    navigate('/initialize?reset_config=true&force_init=true', { replace: true });
  };
  
  // Handle resuming initialization
  const handleResumeInit = () => {
    navigate('/initialize?resume=true', { replace: true });
  };
  
  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case InitStep.Connection:
        return (
          <ConnectionForm onSuccess={handleConnectionSuccess} />
        );
      case InitStep.DatabaseSetup:
        return (
          <DatabaseSetupStep 
            supabaseUrl={supabaseUrl}
            anonKey={anonKey}
            serviceKey={serviceKey}
            onSuccess={handleDatabaseSuccess}
            onBack={() => setCurrentStep(InitStep.Connection)}
          />
        );
      case InitStep.AdminSetup:
        return (
          <AdminSetupForm 
            supabaseUrl={supabaseUrl}
            serviceKey={serviceKey}
            onSuccess={handleAdminSuccess}
            onBack={() => setCurrentStep(InitStep.DatabaseSetup)}
          />
        );
      case InitStep.Complete:
        return (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <ShieldCheck className="h-20 w-20 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Setup Complete</h2>
            <p>Your application is now configured and ready to use.</p>
            <p>Redirecting to the application...</p>
          </div>
        );
    }
  };
  
  // Render the developer info alert
  const renderDevAlert = () => {
    if (isDevelopment()) {
      const connectionInfo = getConnectionInfo();
      
      return (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Developer Information</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              This installation is using URL parameters to control initialization:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><code>force_init=true</code> - Forces initialization page (current: {forceInit ? 'On' : 'Off'})</li>
              <li><code>reset_config=true</code> - Clears stored configuration</li>
              <li><code>resume=true</code> - Resumes initialization (current: {resumeInit ? 'On' : 'Off'})</li>
            </ul>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResetConfig}
                className="text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Reset Configuration
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResumeInit}
                className="text-xs"
              >
                <ArrowRight className="mr-1 h-3 w-3" />
                Resume Setup
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              <p>Environment: {connectionInfo.environment.id}</p>
              <p>Session ID: {sessionId}</p>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };
  
  // Check if there's a saved state that can be resumed
  const renderResumeAlert = () => {
    if (currentStep === InitStep.Connection) {
      try {
        const savedState = localStorage.getItem(INIT_STATE_KEY);
        if (savedState && !resumeInit) {
          const parsedState = JSON.parse(savedState) as InitializationState;
          
          // Only show resume option if saved state is beyond the connection step
          // and is less than 24 hours old
          if (parsedState.step > InitStep.Connection) {
            const savedTime = new Date(parsedState.timestamp).getTime();
            const now = new Date().getTime();
            const hoursSinceSaved = (now - savedTime) / (1000 * 60 * 60);
            
            if (hoursSinceSaved < 24) {
              return (
                <Alert className="mb-6" variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Resume Setup</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      You have a partially completed setup from {hoursSinceSaved < 1 
                        ? 'less than an hour' 
                        : `about ${Math.floor(hoursSinceSaved)} hour${Math.floor(hoursSinceSaved) === 1 ? '' : 's'}`} ago.
                    </p>
                    <Button 
                      onClick={handleResumeInit}
                      size="sm"
                      className="mt-2"
                    >
                      <ArrowRight className="mr-1 h-3 w-3" />
                      Resume Setup
                    </Button>
                  </AlertDescription>
                </Alert>
              );
            }
          }
        }
      } catch (e) {
        // Ignore errors reading saved state
      }
    }
    return null;
  };
  
  // Render the step indicator
  const renderStepIndicator = () => {
    const steps = [
      { icon: <Settings className="h-5 w-5" />, label: 'Connection' },
      { icon: <Database className="h-5 w-5" />, label: 'Database Setup' },
      { icon: <ShieldCheck className="h-5 w-5" />, label: 'Admin Setup' },
    ];
    
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <div className={`h-px w-8 ${index <= currentStep ? 'bg-primary' : 'bg-border'}`} />
            )}
            <div 
              className={`flex flex-col items-center ${
                index === currentStep 
                  ? 'text-primary'
                  : index < currentStep 
                    ? 'text-primary/70' 
                    : 'text-muted-foreground'
              }`}
            >
              <div className={`p-2 rounded-full ${
                index === currentStep 
                  ? 'bg-primary/20 ring-2 ring-primary' 
                  : index < currentStep
                    ? 'bg-primary/10'
                    : 'bg-muted'
              }`}>
                {step.icon}
              </div>
              <span className="text-xs mt-1">{step.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Application Setup</h1>
          <p className="text-muted-foreground">
            Configure your application for first use
          </p>
        </div>
        
        {/* Resume setup alert */}
        {renderResumeAlert()}
        
        {/* Developer information alert */}
        {renderDevAlert()}
        
        {currentStep !== InitStep.Complete && renderStepIndicator()}
        
        <div className="flex justify-center">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default Initialize;
