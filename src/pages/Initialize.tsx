import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ConnectionForm } from '@/components/init/ConnectionForm';
import { DatabaseSetupStep } from '@/components/init/DatabaseSetupStep';
import { AdminSetupForm } from '@/components/init/AdminSetupForm';
import { hasStoredConfig, isDevelopment, clearConfig, getEnvironmentInfo } from '@/config/supabase-config';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, Database, ShieldCheck, Settings, Info, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { runBootstrapDiagnostics } from '@/services/supabase/bootstrap-diagnostics';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/utils/logging';

const INIT_STATE_KEY = 'initialization_state';
const INIT_INTERRUPTED_KEY = 'init_interrupted';
const INIT_IN_PROGRESS_KEY = 'init_in_progress';

enum InitStep {
  Connection = 0,
  DatabaseSetup = 1,
  AdminSetup = 2,
  Complete = 3,
}

const getSavedState = () => {
  try {
    const val = localStorage.getItem(INIT_STATE_KEY);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};
const saveState = (state) => {
  try {
    localStorage.setItem(INIT_STATE_KEY, JSON.stringify(state));
    logger.info('Saved initialization state', { module: 'initialize', step: state.step, sessionId: state.sessionId });
  } catch (e) {
    logger.error('Failed to save initialization state', e, { module: 'initialize' });
  }
};
const hoursAgo = d => (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60);

const Initialize = () => {
  const navigate = useNavigate(), location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const forceInit = urlParams.get('force_init') === 'true';
  const resetConfig = urlParams.get('reset_config') === 'true';
  const resumeInit = urlParams.get('resume') === 'true';

  const sessionId = React.useMemo(() =>
    `init_${Math.random().toString(36).substring(2, 10)}`, []);

  // Initialization state single useState for all step/state data
  const [state, setState] = useState(() => {
    const saved = getSavedState();
    return saved && hoursAgo(saved.timestamp) < 6
      ? { ...saved }
      : {
        step: InitStep.Connection,
        supabaseUrl: '',
        anonKey: '',
        serviceKey: '',
        timestamp: new Date().toISOString(),
        sessionId,
        lastActive: new Date().toISOString(),
        progress: { current: 0, total: 0, message: '' },
      };
  });

  const { step, supabaseUrl, anonKey, serviceKey, progress } = state;

  // Used for blocking hasStoredConfig calls early
  const [hasValidClient, setHasValidClient] = useState(false);

  // Save state on change
  useEffect(() => {
    saveState({ ...state, timestamp: new Date().toISOString(), sessionId });
  }, [state, sessionId]);

  // Heartbeat for lastActive and cleanup on unmount
  useEffect(() => {
    localStorage.setItem(INIT_IN_PROGRESS_KEY, 'true');
    const intv = setInterval(() => {
      saveState({ ...state, lastActive: new Date().toISOString() });
    }, 30000);
    return () => {
      if (state.step < InitStep.Complete)
        localStorage.setItem(INIT_INTERRUPTED_KEY, 'true');
      localStorage.removeItem(INIT_IN_PROGRESS_KEY);
      sessionStorage.removeItem('initialize_redirect_attempted');
      clearInterval(intv);
    };
    // eslint-disable-next-line
  }, [state.step]); // state.sessionId doesn't change

  // Handle initial checks (site config, stored config, reset)
  useEffect(() => {
    (async () => {
      if (resetConfig) {
        clearConfig();
        toast({ title: 'Configuration Reset', description: 'The stored configuration has been cleared.' });
        setTimeout(() => navigate('/initialize?force_init=true', { replace: true }), 100);
        return;
      }
      if (resumeInit) {
        const sav = getSavedState();
        if (sav && hoursAgo(sav.timestamp) < 24) {
          toast({ title: 'Resuming Setup', description: `Continuing from step ${sav.step + 1} of 4.` });
          setState(sav);
          return;
        }
      }
      // site-config check
      const redirectAttempted = sessionStorage.getItem('initialize_redirect_attempted');
      if (redirectAttempted === 'true') return;
      try {
        const resp = await fetch('/site-config.json');
        if (resp.ok) {
          const config = await resp.json();
          if (config?.supabaseUrl?.includes('supabase.co') && config.supabaseAnonKey?.length > 20 && !forceInit) {
            sessionStorage.setItem('initialize_redirect_attempted', 'true');
            toast({ title: 'Already Configured', description: 'Application is already configured with site-config.json.' });
            navigate('/', { replace: true });
            return;
          }
        }
      } catch {/* ignore */}
      // fallback: hasStoredConfig
      setTimeout(() => {
        try {
          if (!forceInit && !resumeInit && hasStoredConfig()) {
            setHasValidClient(true);
            toast({ title: 'Already Configured', description: 'Supabase connection is already configured.' });
            navigate('/');
          } else {
            setHasValidClient(true);
          }
        } catch {/* keep showing initialize */}
      }, 200);
    })();
  }, [navigate, forceInit, resetConfig, resumeInit]);

  const updateState = patch => setState(s => ({ ...s, ...patch }));
  // Step success handlers
  const handleConnectionSuccess = (url, anon, service) => updateState({ supabaseUrl: url, anonKey: anon, serviceKey: service, step: InitStep.DatabaseSetup });
  const handleDatabaseSetupProgress = (current, total, message) => updateState({ progress: { current, total, message } });
  const handleDatabaseSuccess = () => updateState({ step: InitStep.AdminSetup, progress: { current: 0, total: 0, message: '' } });

  const handleAdminSuccess = async () => {
    updateState({ step: InitStep.Complete });
    try {
      const { createSiteConfig, updateStaticSiteConfig } = await import('@/services/site-config/site-config-file-service');
      const siteConfig = createSiteConfig(supabaseUrl, anonKey);
      const updated = await updateStaticSiteConfig(siteConfig);
      toast({
        title: updated ? 'Configuration Saved' : 'Warning',
        description: updated
          ? 'Your configuration has been saved to site-config.json'
          : 'Setup completed but could not update site-config.json',
        variant: updated ? "default" : "destructive"
      });
    } catch {
      toast({
        title: 'Warning',
        description: 'Setup completed but could not update site-config.json',
        variant: "destructive"
      });
    }
    localStorage.removeItem(INIT_STATE_KEY);
    toast({ title: 'Setup Complete', description: 'Your application is now configured and ready to use.' });
    setTimeout(() => navigate('/'), 2000);
  };

  const handleResetConfig = () => navigate('/initialize?reset_config=true&force_init=true', { replace: true });
  const handleResumeInit = () => navigate('/initialize?resume=true', { replace: true });
  const handleRunDiagnostics = async () => {
    try {
      toast({ title: 'Running Diagnostics', description: 'Please wait while we analyze your configuration...' });
      const diagnostics = await runBootstrapDiagnostics();
      toast({
        title: 'Diagnostic Results',
        description: `Found ${diagnostics.recommendations.length} issues to address.`,
        action: {
          altText: "View Details",
          onClick: () => alert(`Recommendations:\n${diagnostics.recommendations.join('\n')}`)
        }
      });
    } catch (error) {
      toast({
        title: 'Diagnostics Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // Step rendering
  const renderStep = () => {
    switch (step) {
      case InitStep.Connection:
        return <ConnectionForm onSuccess={handleConnectionSuccess} />;
      case InitStep.DatabaseSetup:
        return (
          <DatabaseSetupStep
            supabaseUrl={supabaseUrl}
            anonKey={anonKey}
            serviceKey={serviceKey}
            onSuccess={handleDatabaseSuccess}
            onBack={() => updateState({ step: InitStep.Connection })}
            onProgress={handleDatabaseSetupProgress}
          />
        );
      case InitStep.AdminSetup:
        return (
          <AdminSetupForm
            supabaseUrl={supabaseUrl}
            serviceKey={serviceKey}
            onSuccess={handleAdminSuccess}
            onBack={() => updateState({ step: InitStep.DatabaseSetup })}
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
      default:
        return null;
    }
  };

  // Dev info alert
  const renderDevAlert = () => isDevelopment() && (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertTitle>Developer Information</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>This installation uses URL parameters to control initialization:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><code>force_init=true</code> - Forces initialization page (current: {forceInit ? 'On' : 'Off'})</li>
          <li><code>reset_config=true</code> - Clears stored configuration</li>
          <li><code>resume=true</code> - Resumes initialization (current: {resumeInit ? 'On' : 'Off'})</li>
        </ul>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={handleResetConfig} className="text-xs"><RefreshCw className="mr-1 h-3 w-3" />Reset Configuration</Button>
          <Button variant="outline" size="sm" onClick={handleResumeInit} className="text-xs"><ArrowRight className="mr-1 h-3 w-3" />Resume Setup</Button>
          <Button variant="outline" size="sm" onClick={handleRunDiagnostics} className="text-xs"><FileText className="mr-1 h-3 w-3" />Run Diagnostics</Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <p>Environment: {getEnvironmentInfo().id}</p>
          <p>Session ID: {sessionId}</p>
        </div>
      </AlertDescription>
    </Alert>
  );

  // Resume alert
  const renderResumeAlert = () => {
    if (step !== InitStep.Connection || resumeInit) return null;
    const sav = getSavedState();
    if (!sav || sav.step <= InitStep.Connection) return null;
    const ago = hoursAgo(sav.timestamp);
    if (ago < 24) {
      return (
        <Alert className="mb-6" variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Resume Setup</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              You have a partially completed setup from {ago < 1
                ? 'less than an hour'
                : `about ${Math.floor(ago)} hour${Math.floor(ago) === 1 ? '' : 's'}`} ago.
            </p>
            <Button onClick={handleResumeInit} size="sm" className="mt-2">
              <ArrowRight className="mr-1 h-3 w-3" />
              Resume Setup
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const renderStepIndicator = () => {
    const steps = [
      { icon: <Settings className="h-5 w-5" />, label: 'Connection' },
      { icon: <Database className="h-5 w-5" />, label: 'Database Setup' },
      { icon: <ShieldCheck className="h-5 w-5" />, label: 'Admin Setup' },
    ];
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <div className={`h-px w-8 ${idx <= step ? 'bg-primary' : 'bg-border'}`} />}
            <div className={`flex flex-col items-center ${idx === step ? 'text-primary' : idx < step ? 'text-primary/70' : 'text-muted-foreground'}`}>
              <div className={`p-2 rounded-full ${idx === step ? 'bg-primary/20 ring-2 ring-primary' : idx < step ? 'bg-primary/10' : 'bg-muted'}`}>{s.icon}</div>
              <span className="text-xs mt-1">{s.label}</span>
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
          <p className="text-muted-foreground">Configure your application for first use</p>
        </div>
        {renderResumeAlert()}
        {renderDevAlert()}
        {step !== InitStep.Complete && renderStepIndicator()}
        <div className="flex justify-center">{renderStep()}</div>
        {progress?.total > 0 && (
          <div className="w-full mt-4 max-w-xl mx-auto">
            <div className="text-sm text-muted-foreground mb-1">
              {progress.message} ({progress.current}/{progress.total})
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Initialize;
