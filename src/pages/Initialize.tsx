
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectionForm } from '@/components/init/ConnectionForm';
import { DatabaseSetupStep } from '@/components/init/DatabaseSetupStep';
import { AdminSetupForm } from '@/components/init/AdminSetupForm';
import { hasStoredConfig, isDevelopment } from '@/config/supabase-config';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Database, ShieldCheck, Settings } from 'lucide-react';

// Initialize page steps
enum InitStep {
  Connection = 0,
  DatabaseSetup = 1,
  AdminSetup = 2,
  Complete = 3,
}

const Initialize = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<InitStep>(InitStep.Connection);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  
  // Check if already initialized
  useEffect(() => {
    // Allow forcing the initialize page with force_init parameter
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    
    if (!forceInit && hasStoredConfig()) {
      toast({
        title: 'Already Configured',
        description: 'Supabase connection is already configured.',
      });
      navigate('/');
    }
  }, [navigate]);
  
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
        
        {currentStep !== InitStep.Complete && renderStepIndicator()}
        
        <div className="flex justify-center">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default Initialize;
