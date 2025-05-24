
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, AlertTriangle, Database, Settings, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { logger } from '@/utils/logging';
import { simpleBootstrap } from '@/services/supabase/simple-bootstrap';
import { configState, ConfigStatus } from '@/services/config/config-state-manager';
import { ConnectionForm } from '@/components/init/ConnectionForm';
import { DatabaseSetupStep } from '@/components/init/DatabaseSetupStep';
import { AdminSetupForm } from '@/components/init/AdminSetupForm';

enum SetupStep {
  CONNECTION = 'connection',
  DATABASE = 'database', 
  ADMIN = 'admin',
  COMPLETE = 'complete'
}

const Initialize = () => {
  const [currentStep, setCurrentStep] = useState<SetupStep>(SetupStep.CONNECTION);
  const [setupProgress, setSetupProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionConfig, setConnectionConfig] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const forceInit = searchParams.get('force_init') === 'true';

  useEffect(() => {
    // Check if we already have a valid configuration
    const state = configState.getState();
    
    if (!forceInit && state.status === ConfigStatus.READY && state.config) {
      logger.info('Valid configuration found, redirecting to app', {
        module: 'initialize',
        source: state.source
      });
      navigate('/');
      return;
    }

    // If forced init, reset everything
    if (forceInit) {
      simpleBootstrap.reset();
      setCurrentStep(SetupStep.CONNECTION);
      setSetupProgress(0);
    }
  }, [forceInit, navigate]);

  const handleConnectionSuccess = (config: any) => {
    setConnectionConfig(config);
    setCurrentStep(SetupStep.DATABASE);
    setSetupProgress(33);
    setError(null);
    
    logger.info('Connection test successful, proceeding to database setup', {
      module: 'initialize'
    });
  };

  const handleDatabaseSuccess = () => {
    setCurrentStep(SetupStep.ADMIN);
    setSetupProgress(66);
    setError(null);
    
    logger.info('Database setup successful, proceeding to admin setup', {
      module: 'initialize'
    });
  };

  const handleAdminSuccess = () => {
    setCurrentStep(SetupStep.COMPLETE);
    setSetupProgress(100);
    setError(null);
    
    // Save the configuration
    if (connectionConfig && simpleBootstrap.saveConfig(connectionConfig)) {
      logger.info('Setup completed successfully', {
        module: 'initialize'
      });
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } else {
      setError('Failed to save configuration');
    }
  };

  const handleBack = () => {
    setError(null);
    
    switch (currentStep) {
      case SetupStep.DATABASE:
        setCurrentStep(SetupStep.CONNECTION);
        setSetupProgress(0);
        break;
      case SetupStep.ADMIN:
        setCurrentStep(SetupStep.DATABASE);
        setSetupProgress(33);
        break;
      default:
        break;
    }
  };

  const getStepIcon = (step: SetupStep) => {
    if (currentStep === step) {
      return isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Settings className="h-5 w-5" />;
    }
    
    const stepOrder = [SetupStep.CONNECTION, SetupStep.DATABASE, SetupStep.ADMIN, SetupStep.COMPLETE];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex || currentStep === SetupStep.COMPLETE) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    switch (step) {
      case SetupStep.CONNECTION:
        return <Database className="h-5 w-5 text-muted-foreground" />;
      case SetupStep.DATABASE:
        return <Database className="h-5 w-5 text-muted-foreground" />;
      case SetupStep.ADMIN:
        return <Settings className="h-5 w-5 text-muted-foreground" />;
      case SetupStep.COMPLETE:
        return <CheckCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Application Setup</h1>
          <p className="text-muted-foreground">
            Configure your database connection and initial settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStepIcon(currentStep)}
                {currentStep === SetupStep.CONNECTION && 'Database Connection'}
                {currentStep === SetupStep.DATABASE && 'Database Setup'}
                {currentStep === SetupStep.ADMIN && 'Admin Account'}
                {currentStep === SetupStep.COMPLETE && 'Setup Complete'}
              </CardTitle>
              
              {currentStep !== SetupStep.CONNECTION && currentStep !== SetupStep.COMPLETE && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            
            <Progress value={setupProgress} className="w-full" />
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Setup Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {currentStep === SetupStep.CONNECTION && (
              <ConnectionForm
                onSuccess={handleConnectionSuccess}
                onError={setError}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}

            {currentStep === SetupStep.DATABASE && connectionConfig && (
              <DatabaseSetupStep
                supabaseUrl={connectionConfig.url}
                anonKey={connectionConfig.anonKey}
                serviceKey={connectionConfig.serviceKey}
                onSuccess={handleDatabaseSuccess}
                onBack={handleBack}
              />
            )}

            {currentStep === SetupStep.ADMIN && connectionConfig && (
              <AdminSetupForm
                onSuccess={handleAdminSuccess}
                onError={setError}
                config={connectionConfig}
              />
            )}

            {currentStep === SetupStep.COMPLETE && (
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-green-700">Setup Complete!</h3>
                  <p className="text-muted-foreground">
                    Your application has been configured successfully.
                  </p>
                </div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Ready to Use</AlertTitle>
                  <AlertDescription>
                    You'll be redirected to the application in a moment.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {getStepIcon(SetupStep.CONNECTION)}
              <span>Connection</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              {getStepIcon(SetupStep.DATABASE)}
              <span>Database</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              {getStepIcon(SetupStep.ADMIN)}
              <span>Admin</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              {getStepIcon(SetupStep.COMPLETE)}
              <span>Complete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Initialize;
