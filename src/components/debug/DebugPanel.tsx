
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCcw, 
  Settings, 
  Database,
  FileText,
  Monitor,
  Trash2,
  Download
} from 'lucide-react';
import { selfHealingBootstrap, BootstrapStatus } from '@/services/bootstrap/self-healing-bootstrap';
import { unifiedConfig } from '@/services/config/unified-config-service';
import { clientManager } from '@/services/supabase/client-manager';
import { bootstrapPhases } from '@/services/bootstrap/bootstrap-phases';
import { logger } from '@/utils/logging';
import { clearAllEnvironmentConfigs } from '@/config/supabase-config';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<BootstrapStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Refresh status
  const refreshStatus = async () => {
    setIsLoading(true);
    try {
      const newStatus = await selfHealingBootstrap.getStatus();
      setStatus(newStatus);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      logger.error('Failed to refresh debug status', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen]);

  // Heal system
  const handleHeal = async () => {
    setIsLoading(true);
    try {
      const success = await selfHealingBootstrap.performHealing();
      if (success) {
        await refreshStatus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all configuration
  const handleResetAll = async () => {
    if (!confirm('This will clear all configuration and force re-initialization. Continue?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Clear all configs
      clearAllEnvironmentConfigs();
      unifiedConfig.clearCache();
      unifiedConfig.clearLocalStorage();
      
      // Reset client manager
      await clientManager.destroy();
      
      // Reset bootstrap phases
      bootstrapPhases.reset();
      
      // Clear healing data
      localStorage.removeItem('last_successful_bootstrap');
      localStorage.removeItem('healing_attempts');
      
      // Reload page
      window.location.href = '/initialize?force_init=true';
    } catch (error) {
      logger.error('Failed to reset configuration', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate static config
  const handleRegenerateStatic = async () => {
    setIsLoading(true);
    try {
      const success = await selfHealingBootstrap.regenerateStaticConfig();
      if (success) {
        await refreshStatus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Export debug information
  const handleExportDebug = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      status,
      url: window.location.href,
      userAgent: navigator.userAgent,
      bootstrapPhase: bootstrapPhases.getState(),
      clientState: clientManager.getState(),
      localStorage: Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('spark')
      ).reduce((acc, key) => {
        acc[key] = localStorage.getItem(key)?.substring(0, 100) + '...';
        return acc;
      }, {} as Record<string, string>)
    };

    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-info-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <Card className="border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              System Debug Panel
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshStatus} disabled={isLoading}>
                <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* System Status */}
            <div>
              <h3 className="text-lg font-semibold mb-3">System Status</h3>
              {status ? (
                <Alert variant={status.isHealthy ? "default" : "destructive"}>
                  {status.isHealthy ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    System is {status.isHealthy ? 'Healthy' : 'Unhealthy'}
                  </AlertTitle>
                  <AlertDescription>
                    Last updated: {lastUpdate}
                    {status.lastSuccessfulBootstrap && (
                      <div className="mt-2">
                        Last successful bootstrap: {new Date(status.lastSuccessfulBootstrap).toLocaleString()}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Loading status...
                </div>
              )}
            </div>

            <Separator />

            {/* Configuration Sources */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Configuration Sources</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {status && Object.entries(status.configSources).map(([source, available]) => (
                  <div key={source} className="text-center">
                    <Badge variant={available ? "default" : "secondary"} className="mb-2">
                      {source.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {available ? 'Available' : 'Not Available'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Errors */}
            {status?.errors && status.errors.length > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Current Issues</h3>
                  <div className="space-y-2">
                    {status.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Recovery Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button 
                  onClick={handleHeal} 
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Auto-Heal
                </Button>
                
                <Button 
                  onClick={handleRegenerateStatic}
                  disabled={isLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Regenerate Static
                </Button>
                
                <Button 
                  onClick={handleExportDebug}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Debug
                </Button>
                
                <Button 
                  onClick={handleResetAll}
                  disabled={isLoading}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Reset All
                </Button>
              </div>
            </div>

            {/* System Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Environment:</strong> {import.meta.env.MODE}
                </div>
                <div>
                  <strong>Host:</strong> {window.location.hostname}
                </div>
                <div>
                  <strong>Client Instances:</strong> {status?.clientInstances || 'Unknown'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
