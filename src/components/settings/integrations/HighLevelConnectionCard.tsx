import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Unplug, 
  RefreshCw,
  Clock,
  AlertTriangle,
  Building2,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

// GHL OAuth scopes - adjust based on your app's needs
const GHL_SCOPES = 'locations.readonly contacts.readonly contacts.write opportunities.readonly opportunities.write users.readonly';

interface GHLInstallation {
  id: string;
  location_id: string | null;
  location_name: string | null;
  company_id: string | null;
  company_name: string | null;
  scopes: string | null;
  connection_status: 'connected' | 'expired' | 'error' | 'disconnected' | 'pending';
  connected_at: string;
  token_expires_at: string;
  refresh_error: string | null;
}

export function HighLevelConnectionCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [installation, setInstallation] = useState<GHLInstallation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch both installation and client_id in parallel
      const [installationResult, clientIdResult] = await Promise.all([
        supabase
          .from('ghl_installations')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'ghl_client_id')
          .maybeSingle()
      ]);

      if (installationResult.error) throw installationResult.error;
      setInstallation(installationResult.data);

      // Check if client_id is configured
      if (clientIdResult.data?.value) {
        setClientId(clientIdResult.data.value);
        setConfigError(null);
      } else {
        setClientId(null);
        setConfigError('HighLevel integration not configured. Contact your administrator.');
      }
    } catch (error) {
      console.error('Error fetching GHL data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    if (!clientId) {
      toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'HighLevel Client ID is not configured. Contact your administrator.',
      });
      return;
    }

    // Build OAuth URL
    const redirectUri = `${window.location.origin}/oauth`;
    const state = crypto.randomUUID(); // CSRF protection
    
    // Store state for verification
    sessionStorage.setItem('ghl_oauth_state', state);
    
    // Redirect to GHL OAuth
    const authUrl = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', GHL_SCOPES);
    authUrl.searchParams.set('state', state);
    
    window.location.href = authUrl.toString();
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect HighLevel? You will need to reconnect to use HighLevel features.')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('ghl-disconnect');
      
      if (error) throw error;

      setInstallation(null);
      toast({
        title: 'Disconnected',
        description: 'HighLevel has been disconnected from your account',
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to disconnect HighLevel',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getStatusBadge = () => {
    if (!installation) return null;

    const now = new Date();
    const expiresAt = new Date(installation.token_expires_at);
    const isExpiringSoon = expiresAt.getTime() - now.getTime() < 60 * 60 * 1000;

    switch (installation.connection_status) {
      case 'connected':
        if (isExpiringSoon) {
          return (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              <Clock className="h-3 w-3 mr-1" />
              Expiring Soon
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            <XCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-background/60">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">HighLevel (GoHighLevel)</CardTitle>
              <CardDescription>CRM & Marketing Automation Platform</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {configError && !installation ? (
          // Configuration error state
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>{configError}</AlertDescription>
          </Alert>
        ) : !installation ? (
          // Not connected state
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your HighLevel account to enable CRM integration, contact sync, and automation features.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Contacts</Badge>
              <Badge variant="secondary">Opportunities</Badge>
              <Badge variant="secondary">Locations</Badge>
              <Badge variant="secondary">Users</Badge>
            </div>
            <Button onClick={handleConnect} className="w-full sm:w-auto" disabled={!clientId}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect HighLevel
            </Button>
          </div>
        ) : (
          // Connected state
          <div className="space-y-4">
            {/* Location Info */}
            {installation.location_name && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium">{installation.location_name}</div>
                {installation.location_id && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {installation.location_id}
                  </div>
                )}
              </div>
            )}

            {/* Scopes */}
            {installation.scopes && (
              <div>
                <div className="text-sm font-medium mb-2">Granted Permissions</div>
                <div className="flex flex-wrap gap-1">
                  {installation.scopes.split(' ').map((scope) => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope.replace('.', ' ').replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Connection Info */}
            <div className="text-xs text-muted-foreground">
              Connected {formatDistanceToNow(new Date(installation.connected_at), { addSuffix: true })}
            </div>

            {/* Error Alert */}
            {installation.refresh_error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {installation.refresh_error}
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleConnect}
                className="flex-1 sm:flex-none"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex-1 sm:flex-none"
              >
                {isDisconnecting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unplug className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}