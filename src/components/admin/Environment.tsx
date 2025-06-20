
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Globe, Server, Database, Code, Activity, Settings2, Download } from 'lucide-react';
import { getEnvironmentInfo, setEnvironmentOverride, clearEnvironmentOverride } from '@/config/supabase/environment';
import { collectEnvironmentInfo } from '@/utils/debug/environment-debug';
import { globalStateService } from '@/services/debug/global-state-service';
import { logger } from '@/utils/logging';

export default function Environment() {
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null);
  const [supabaseInfo, setSupabaseInfo] = useState<any>(null);
  const [performanceInfo, setPerformanceInfo] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [envOverride, setEnvOverride] = useState('');

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Collect environment information
      collectEnvironmentInfo();
      
      // Get current environment info
      const envInfo = getEnvironmentInfo();
      setEnvironmentInfo(envInfo);
      
      // Get global state information
      const globalState = globalStateService.getDebugState();
      setSupabaseInfo(globalState.supabaseInfo || {});
      setPerformanceInfo(globalState.performanceInfo || {});
      
      logger.info('Environment data refreshed', { module: 'environment-page' });
    } catch (error) {
      logger.error('Failed to refresh environment data', error, { module: 'environment-page' });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleEnvironmentOverride = (enabled: boolean) => {
    if (enabled && envOverride) {
      setEnvironmentOverride(envOverride);
    } else {
      clearEnvironmentOverride();
    }
    setTimeout(refreshData, 100);
  };

  const exportDiagnostics = () => {
    const diagnostics = {
      environment: environmentInfo,
      supabase: supabaseInfo,
      performance: performanceInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const blob = new Blob([JSON.stringify(diagnostics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `environment-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Safe environment variable access
  const getBuildInfo = () => {
    try {
      return {
        version: import.meta.env.VITE_APP_VERSION || 'Unknown',
        buildDate: import.meta.env.VITE_BUILD_DATE || 'Unknown',
        commitHash: import.meta.env.VITE_COMMIT_HASH || 'Unknown'
      };
    } catch (error) {
      logger.warn('Failed to get build info', error, { module: 'environment-page' });
      return {
        version: 'Unknown',
        buildDate: 'Unknown',
        commitHash: 'Unknown'
      };
    }
  };

  const buildInfo = getBuildInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Environment Information</h2>
          <p className="text-muted-foreground">
            Detailed information about the current environment and system status
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportDiagnostics}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Diagnostics
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment Detection */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Globe className="h-5 w-5 mr-2" />
            <CardTitle className="text-lg">Environment Detection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Environment Type:</span>
              <Badge variant={environmentInfo?.isDevelopment ? "secondary" : "default"}>
                {environmentInfo?.type || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Hostname:</span>
              <span className="text-sm text-muted-foreground">{environmentInfo?.hostname}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Development Mode:</span>
              <Badge variant={environmentInfo?.isDevelopment ? "destructive" : "secondary"}>
                {environmentInfo?.isDevelopment ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Has Override:</span>
              <Badge variant={environmentInfo?.hasOverride ? "outline" : "secondary"}>
                {environmentInfo?.hasOverride ? 'Yes' : 'No'}
              </Badge>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Environment Override</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g., staging, production"
                  value={envOverride}
                  onChange={(e) => setEnvOverride(e.target.value)}
                  className="flex-1 px-3 py-1 text-sm border rounded-md"
                />
                <Switch
                  checked={environmentInfo?.hasOverride}
                  onCheckedChange={handleEnvironmentOverride}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Host Information */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Server className="h-5 w-5 mr-2" />
            <CardTitle className="text-lg">Host Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Timezone:</span>
              <span className="text-sm text-muted-foreground">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Language:</span>
              <span className="text-sm text-muted-foreground">{navigator.language}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Platform:</span>
              <span className="text-sm text-muted-foreground">{navigator.platform}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Online:</span>
              <Badge variant={navigator.onLine ? "default" : "destructive"}>
                {navigator.onLine ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Viewport:</span>
              <span className="text-sm text-muted-foreground">
                {window.innerWidth} × {window.innerHeight}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Device Pixel Ratio:</span>
              <span className="text-sm text-muted-foreground">{window.devicePixelRatio}</span>
            </div>
          </CardContent>
        </Card>

        {/* Supabase Information */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Database className="h-5 w-5 mr-2" />
            <CardTitle className="text-lg">Supabase Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Status:</span>
              <Badge variant={supabaseInfo?.isInitialized ? "default" : "destructive"}>
                {supabaseInfo?.connectionStatus || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Environment:</span>
              <span className="text-sm text-muted-foreground">
                {supabaseInfo?.environment || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Latency:</span>
              <span className="text-sm text-muted-foreground">
                {supabaseInfo?.connectionLatency ? `${supabaseInfo.connectionLatency}ms` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Auth Status:</span>
              <Badge variant={supabaseInfo?.authStatus === 'authenticated' ? "default" : "secondary"}>
                {supabaseInfo?.authStatus || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Retry Count:</span>
              <span className="text-sm text-muted-foreground">{supabaseInfo?.retryCount || 0}</span>
            </div>
            {supabaseInfo?.lastError && (
              <div className="space-y-1">
                <span className="text-sm font-medium text-destructive">Last Error:</span>
                <p className="text-xs text-muted-foreground break-all">{supabaseInfo.lastError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Activity className="h-5 w-5 mr-2" />
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {performanceInfo?.memory && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Used Memory:</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(performanceInfo.memory.usedJSHeapSize / 1024 / 1024)}MB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Memory:</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(performanceInfo.memory.totalJSHeapSize / 1024 / 1024)}MB
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">FPS:</span>
              <span className="text-sm text-muted-foreground">{performanceInfo?.fps || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Type:</span>
              <span className="text-sm text-muted-foreground">
                {(navigator as any)?.connection?.effectiveType || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Hardware Concurrency:</span>
              <span className="text-sm text-muted-foreground">{navigator.hardwareConcurrency}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Build Information */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Code className="h-5 w-5 mr-2" />
          <CardTitle className="text-lg">Build & Version Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-sm font-medium">App Version:</span>
              <p className="text-sm text-muted-foreground">
                {buildInfo.version}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Build Date:</span>
              <p className="text-sm text-muted-foreground">
                {buildInfo.buildDate}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Commit Hash:</span>
              <p className="text-sm text-muted-foreground font-mono">
                {buildInfo.commitHash}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Settings2 className="h-5 w-5 mr-2" />
          <CardTitle className="text-lg">Debug Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">Debug Mode</label>
              <p className="text-xs text-muted-foreground">
                Enable additional logging and debug information
              </p>
            </div>
            <Switch
              checked={debugMode}
              onCheckedChange={setDebugMode}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <span className="text-sm font-medium">Storage Information</span>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium">LocalStorage Items:</span>
                <p className="text-muted-foreground">{Object.keys(localStorage).length}</p>
              </div>
              <div>
                <span className="font-medium">SessionStorage Items:</span>
                <p className="text-muted-foreground">{Object.keys(sessionStorage).length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
