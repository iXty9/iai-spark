
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ConnectionForm } from '@/components/init/ConnectionForm';
import { DatabaseSetupStep } from '@/components/init/DatabaseSetupStep';
import { AdminSetupForm } from '@/components/init/AdminSetupForm';
import { hasStoredConfig, isDevelopment, clearConfig } from '@/config/supabase-config';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Database, ShieldCheck, Settings, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Initialize page steps
enum InitStep {
  Connection = 0,
  DatabaseSetup = 1,
  AdminSetup = 2,
  Complete = 3,
}

const Initialize = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<InitStep>(InitStep.Connection);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(location.search);
  const forceInit = urlParams.get('force_init') === 'true';
  const resetConfig = urlParams.get('reset_config') === 'true';
  
  // Check if already initialized
  useEffect(() => {
    if (resetConfig) {
      // Clear config and reload without params
      clearConfig();
      toast({
        title: 'Configuration Reset',
        description: 'The stored configuration has been cleared.',
      });
      // Reload the page without parameters
      navigate('/initialize');
      return;
    }
    
    // Allow forcing the initialize page with force_init parameter
    if (!forceInit && hasStoredConfig()) {
      toast({
        title: 'Already Configured',
        description: 'Supabase connection is already configured.',
      });
      navigate('/');
    }
  }, [navigate, forceInit, resetConfig]);
  
  // Handle successful connection setup
  const handleConnectionSuccess = (url: string, anon: string, service: string) => {
    setSupabaseUrl(url);
    setAnonKey(anon);
    setServiceKey(service);
    setCurrentStep(InitStep.DatabaseSetup);
  };
  
  // Handle successful database initialization
  const handleDatabaseSuccess = () => {
    setCurrentStep(InitStep.AdminSetup);
  };
  
  // Handle successful admin creation
  const handleAdminSuccess = () => {
    setCurrentStep(InitStep.Complete);
    toast({
      title: 'Setup Complete',
      description: 'Your application is now configured and ready to use.',
    });
    
    // Redirect to home after a short delay
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };
  
  // Reset stored configuration
  const handleResetConfig = () => {
    navigate('/initialize?reset_config=true');
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
            </ul>
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResetConfig}
                className="text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Reset Configuration
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
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
