
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
import { useAuth } from '@/contexts/AuthContext';
import { getClient } from '@/integrations/supabase/client';
import { getBuildInfoFromSiteConfig } from '@/utils/site-config-utils';

// Reusable Info Row with optional properties
const Info = ({ label, value, badgeVariant, className = '', mono }: {
  label: string;
  value: any;
  badgeVariant?: string;
  className?: string;
  mono?: boolean;
}) => (
  <div className={`flex items-center justify-between ${className}`}>
    <span className="text-sm font-medium">{label}</span>
    {badgeVariant ? (
      <Badge variant={badgeVariant as any}>{value}</Badge>
    ) : (
      <span className={`text-sm text-muted-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
    )}
  </div>
);

export default function Environment() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const [env, setEnv] = useState(null);
  const [supabase, setSupabase] = useState(null);
  const [perf, setPerf] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [envOverride, setEnvOverride] = useState('');
  const [fps, setFps] = useState(0);
  const [build, setBuild] = useState(null);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      collectEnvironmentInfo();
      const e = getEnvironmentInfo(); setEnv(e);
      setBuild(await getBuildInfoFromSiteConfig());
      const g = globalStateService.getDebugState();
      const client = getClient();
      const supa = {
        ...g.supabaseInfo,
        connectionStatus: client ? 'connected' : 'disconnected',
        authStatus: isAuthenticated ? 'authenticated' : 'unauthenticated',
        isInitialized: !!client,
        environment: e.type
      };
      if (client) {
        const t0 = performance.now();
        try {
          await client.from('profiles').select('count', { count: 'exact' }).limit(1);
          supa.connectionLatency = Math.round(performance.now() - t0);
        } catch (error) {
          supa.lastError = error?.message || 'Connection test failed';
        }
      }
      setSupabase(supa);
      setPerf({
        ...g.performanceInfo,
        fps,
        memory: performance.memory && {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        }
      });
      logger.info('Environment data refreshed', { module: 'environment-page' });
    } catch (error) {
      logger.error('Failed to refresh environment data', error, { module: 'environment-page' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // FPS tracking
  useEffect(() => {
    let frame = 0, last = performance.now(), time = 0, id;
    const loop = now => {
      frame++, time += now - last, last = now;
      if (time >= 1000) frame && setFps(Math.round((frame * 1000) / time)), frame = 0, time = 0;
      id = requestAnimationFrame(loop);
    }; id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const handleOverride = enabled => {
    enabled && envOverride ? setEnvironmentOverride(envOverride) : clearEnvironmentOverride();
    setTimeout(refreshData, 100);
  };

  const exportDiagnostics = () => {
    const blob = new Blob([JSON.stringify({
      environment: env, supabase, performance: perf,
      timestamp: new Date().toISOString(), userAgent: navigator.userAgent, url: window.location.href
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `environment-diagnostics-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // For badge coloring
  const boolBadge = (val, on = "default", off = "destructive") => val ? on : off;

  // Shorthands for quick data lookup
  const e = env || {}, s = supabase || {}, p = perf || {}, b = build || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Environment Information</h2>
          <p className="text-sm md:text-base text-muted-foreground">Detailed information about the current environment and system status</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={exportDiagnostics} className="flex items-center gap-2 justify-center">
            <Download className="h-4 w-4" /> 
            <span className="hidden sm:inline">Export Diagnostics</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isRefreshing} className="flex items-center gap-2 justify-center">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> 
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment Detection */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Globe className="h-5 w-5 mr-2" /><CardTitle className="text-lg">Environment Detection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Info label="Environment Type:" value={e.type || 'Unknown'} badgeVariant={e.isDevelopment ? "secondary" : "default"} />
            <Info label="Hostname:" value={window.location.hostname} />
            <Info label="Development Mode:" value={e.isDevelopment ? 'Yes' : 'No'} badgeVariant={boolBadge(e.isDevelopment, "destructive", "secondary")} />
            <Info label="Has Override:" value={e.hasOverride ? 'Yes' : 'No'} badgeVariant={boolBadge(e.hasOverride, "outline", "secondary")} />
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium">Environment Override</label>
              <div className="flex items-center space-x-2">
                <input type="text" placeholder="e.g., staging, production" value={envOverride} onChange={e => setEnvOverride(e.target.value)} className="flex-1 px-3 py-1 text-sm border rounded-md" />
                <Switch checked={e.hasOverride} onCheckedChange={handleOverride} />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Host Information */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Server className="h-5 w-5 mr-2" /><CardTitle className="text-lg">Host Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Info label="Timezone:" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
            <Info label="Language:" value={navigator.language} />
            <Info label="Platform:" value={navigator.platform} />
            <Info label="Online:" value={navigator.onLine ? 'Yes' : 'No'} badgeVariant={boolBadge(navigator.onLine)} />
            <Info label="Viewport:" value={`${window.innerWidth} × ${window.innerHeight}`} />
            <Info label="Device Pixel Ratio:" value={window.devicePixelRatio} />
          </CardContent>
        </Card>
        {/* Supabase Information */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Database className="h-5 w-5 mr-2" /><CardTitle className="text-lg">Supabase Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Info label="Connection Status:" value={s.connectionStatus || 'Unknown'} badgeVariant={boolBadge(s.connectionStatus === 'connected', "default", "destructive")} />
            <Info label="Environment:" value={s.environment || 'Unknown'} />
            <Info label="Latency:" value={s.connectionLatency ? `${s.connectionLatency}ms` : 'N/A'} />
            <Info label="Auth Status:" value={s.authStatus || 'Unknown'} badgeVariant={s.authStatus === 'authenticated' ? "default" : "secondary"} />
            <Info label="User ID:" value={user?.id ? `${user.id.substring(0, 8)}...` : 'None'} mono={true} />
            {s.lastError && (
              <div className="space-y-1">
                <span className="text-sm font-medium text-destructive">Last Error:</span>
                <p className="text-xs text-muted-foreground break-all">{s.lastError}</p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Performance Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Activity className="h-5 w-5 mr-2" /><CardTitle className="text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Info label="FPS:" value={fps || 'Calculating...'} />
            {p.memory && <>
              <Info label="Used Memory:" value={`${Math.round(p.memory.usedJSHeapSize / 1024 / 1024)}MB`} />
              <Info label="Total Memory:" value={`${Math.round(p.memory.totalJSHeapSize / 1024 / 1024)}MB`} />
            </>}
            <Info label="Connection Type:" value={(navigator as any).connection?.effectiveType || 'Unknown'} />
            <Info label="Hardware Concurrency:" value={navigator.hardwareConcurrency} />
          </CardContent>
        </Card>
      </div>
      {/* Build Information */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Code className="h-5 w-5 mr-2" /><CardTitle className="text-lg">Build & Version Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Info label="App Version:" value={b.version || 'Loading...'} />
            <Info label="Build Date:" value={b.buildDate || 'Loading...'} />
            <Info label="Environment:" value={b.environment || 'Loading...'} />
            <Info label="Build Hash:" value={b.commitHash || 'Loading...'} mono={true} />
          </div>
        </CardContent>
      </Card>
      {/* Debug Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Settings2 className="h-5 w-5 mr-2" /><CardTitle className="text-lg">Debug Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">Debug Mode</label>
              <p className="text-xs text-muted-foreground">Enable additional logging and debug information</p>
            </div>
            <Switch checked={false} onCheckedChange={() => {}} />
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
