import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RefreshCw, Copy, CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink, Info, Save, Trash2, Eye, EyeOff, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { updateAppSetting } from '@/services/admin/settingsService';

// Generate a secure random proxy secret
function generateProxySecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = 'ixty_';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

interface GHLInstallation {
  id: string;
  user_id: string | null;
  location_id: string | null;
  location_name: string | null;
  company_id: string | null;
  company_name: string | null;
  scopes: string | null;
  connection_status: 'connected' | 'expired' | 'error' | 'disconnected' | 'pending';
  connected_at: string;
  last_refresh_at: string | null;
  token_expires_at: string | null;
  refresh_error: string | null;
  // Joined user email
  user_email?: string;
}

export function HighLevelSettings() {
  const { toast } = useToast();
  const [installations, setInstallations] = useState<GHLInstallation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingUserId, setRefreshingUserId] = useState<string | null>(null);
  const [deletingInstallationId, setDeletingInstallationId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [proxySecret, setProxySecret] = useState('');
  const [showProxySecret, setShowProxySecret] = useState(false);
  const [isSavingProxySecret, setIsSavingProxySecret] = useState(false);
  const [isSavingClientId, setIsSavingClientId] = useState(false);

  // OAuth callback URL for GHL app configuration
  const callbackUrl = `${window.location.origin}/oauth`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch installations, client_id, and proxy_secret in parallel
      const [installationsResult, clientIdResult, proxySecretResult] = await Promise.all([
        supabase
          .from('ghl_installations')
          .select('*')
          .order('connected_at', { ascending: false }),
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'ghl_client_id')
          .maybeSingle(),
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'ghl_proxy_secret')
          .maybeSingle()
      ]);

      if (installationsResult.error) throw installationsResult.error;
      setInstallations(installationsResult.data || []);
      
      if (clientIdResult.data?.value) {
        setClientId(clientIdResult.data.value);
      }
      
      if (proxySecretResult.data?.value) {
        setProxySecret(proxySecretResult.data.value);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load HighLevel settings',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClientId = async () => {
    setIsSavingClientId(true);
    try {
      await updateAppSetting('ghl_client_id', clientId);
      toast({
        title: 'Saved',
        description: 'HighLevel Client ID has been updated',
      });
    } catch (error) {
      console.error('Error saving client ID:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save Client ID',
      });
    } finally {
      setIsSavingClientId(false);
    }
  };

  const handleGenerateProxySecret = async () => {
    setIsSavingProxySecret(true);
    try {
      const newSecret = generateProxySecret();
      await updateAppSetting('ghl_proxy_secret', newSecret);
      setProxySecret(newSecret);
      setShowProxySecret(true); // Show the new secret immediately
      toast({
        title: 'Secret Generated',
        description: 'New proxy secret has been generated. Update your n8n workflows.',
      });
    } catch (error) {
      console.error('Error generating proxy secret:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate proxy secret',
      });
    } finally {
      setIsSavingProxySecret(false);
    }
  };

  const getMaskedSecret = (secret: string) => {
    if (!secret) return '';
    const prefix = secret.slice(0, 5); // "ixty_"
    return `${prefix}${'•'.repeat(Math.min(secret.length - 5, 16))}`;
  };

  const handleRefreshToken = async (userId: string) => {
    setRefreshingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('ghl-token-refresh', {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: 'Token refreshed',
        description: 'The access token has been refreshed successfully',
      });

      // Reload installations
      await fetchData();
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast({
        variant: 'destructive',
        title: 'Refresh failed',
        description: 'Failed to refresh the access token',
      });
    } finally {
      setRefreshingUserId(null);
    }
  };

  const handleDeleteInstallation = async (installationId: string) => {
    setDeletingInstallationId(installationId);
    try {
      const { error } = await supabase
        .from('ghl_installations')
        .delete()
        .eq('id', installationId);

      if (error) throw error;

      toast({
        title: 'Installation deleted',
        description: 'The HighLevel connection record has been removed',
      });

      // Reload installations
      await fetchData();
    } catch (error) {
      console.error('Error deleting installation:', error);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: 'Failed to delete the installation record',
      });
    } finally {
      setDeletingInstallationId(null);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: 'Copied',
      description: `${field} copied to clipboard`,
    });
  };

  const getStatusBadge = (installation: GHLInstallation) => {
    // Handle pending status first
    if (installation.connection_status === 'pending') {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"><Clock className="h-3 w-3 mr-1" />Pending Link</Badge>;
    }

    // Check expiry only if token_expires_at exists
    const now = new Date();
    const expiresAt = installation.token_expires_at ? new Date(installation.token_expires_at) : null;
    const isExpiringSoon = expiresAt ? expiresAt.getTime() - now.getTime() < 60 * 60 * 1000 : false;

    switch (installation.connection_status) {
      case 'connected':
        if (isExpiringSoon) {
          return <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"><Clock className="h-3 w-3 mr-1" />Expiring Soon</Badge>;
        }
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  const getHealthSummary = () => {
    const healthy = installations.filter(i => i.connection_status === 'connected').length;
    const pending = installations.filter(i => i.connection_status === 'pending').length;
    const expiring = installations.filter(i => {
      if (!i.token_expires_at) return false;
      const expiresAt = new Date(i.token_expires_at);
      const now = new Date();
      return i.connection_status === 'connected' && expiresAt.getTime() - now.getTime() < 60 * 60 * 1000;
    }).length;
    const failed = installations.filter(i => i.connection_status === 'error' || i.connection_status === 'expired').length;
    
    return { healthy: healthy - expiring, expiring, failed, pending };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const health = getHealthSummary();

  return (
    <div className="space-y-6">
      {/* Configuration Section */}
      <Card className="bg-background/60">
        <CardHeader>
          <CardTitle className="text-lg">HighLevel App Configuration</CardTitle>
          <CardDescription>
            Use these values when configuring your HighLevel Marketplace app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client ID Configuration */}
          <div className="space-y-2">
            <Label htmlFor="client-id">GHL Client ID</Label>
            <div className="flex gap-2">
              <Input
                id="client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter your HighLevel Client ID"
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={handleSaveClientId}
                disabled={isSavingClientId}
              >
                {isSavingClientId ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get this from your HighLevel Marketplace Developer settings
            </p>
          </div>

          {/* OAuth Callback URL */}
          <div className="space-y-2">
            <Label htmlFor="callback-url">OAuth Callback URL</Label>
            <div className="flex gap-2">
              <Input
                id="callback-url"
                value={callbackUrl}
                readOnly
                className="font-mono text-sm bg-muted/50"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(callbackUrl, 'Callback URL')}
              >
                {copiedField === 'Callback URL' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add this URL to your HighLevel app's redirect URIs
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              GHL Client Secret is stored securely as a Supabase Edge Function secret (GHL_CLIENT_SECRET). 
              <a 
                href="https://supabase.com/dashboard/project/ymtdtzkskjdqlzhjuesk/settings/functions" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1 inline-flex items-center gap-1"
              >
                Manage secrets <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* API Proxy Configuration */}
      <Card className="bg-background/60">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Proxy Configuration
          </CardTitle>
          <CardDescription>
            Configure the shared secret for n8n workflow integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proxy-secret">Proxy Secret</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="proxy-secret"
                  value={showProxySecret ? proxySecret : getMaskedSecret(proxySecret)}
                  readOnly
                  placeholder="No secret configured"
                  className="font-mono text-sm bg-muted/50 pr-10"
                />
                {proxySecret && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowProxySecret(!showProxySecret)}
                  >
                    {showProxySecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(proxySecret, 'Proxy Secret')}
                disabled={!proxySecret}
              >
                {copiedField === 'Proxy Secret' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateProxySecret}
                disabled={isSavingProxySecret}
              >
                {isSavingProxySecret ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    {proxySecret ? 'Rotate' : 'Generate'}
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this secret in the <code className="bg-muted px-1 rounded">X-Ixty-Proxy-Secret</code> header when calling the GHL API proxy from n8n
            </p>
          </div>

          {proxySecret && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Rotating this secret will require updating the header in all n8n workflows that use the GHL API proxy.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Health Summary */}
      <Card className="bg-background/60">
        <CardHeader>
          <CardTitle className="text-lg">Connection Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">{health.healthy}</div>
              <div className="text-sm text-green-600 dark:text-green-500">Healthy</div>
            </div>
            <div className="p-4 rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{health.expiring}</div>
              <div className="text-sm text-amber-600 dark:text-amber-500">Expiring Soon</div>
            </div>
            <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/20">
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">{health.failed}</div>
              <div className="text-sm text-red-600 dark:text-red-500">Failed</div>
            </div>
            <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{health.pending}</div>
              <div className="text-sm text-blue-600 dark:text-blue-500">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installations Table */}
      <Card className="bg-background/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">All Installations</CardTitle>
            <CardDescription>
              {installations.length} user{installations.length !== 1 ? 's' : ''} connected to HighLevel
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {installations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No HighLevel installations yet. Users can connect from Settings → Integrations.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Token Expires</TableHead>
                    <TableHead>Connected</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installations.map((installation) => (
                    <TableRow key={installation.id}>
                      <TableCell className="font-mono text-xs">
                        {installation.user_id ? `${installation.user_id.slice(0, 8)}...` : <span className="text-muted-foreground italic">Pending</span>}
                      </TableCell>
                      <TableCell>
                        {installation.location_name || installation.location_id || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(installation)}</TableCell>
                      <TableCell className="text-sm">
                        {installation.token_expires_at 
                          ? format(new Date(installation.token_expires_at), 'MMM d, HH:mm')
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(installation.connected_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {installation.user_id && installation.connection_status !== 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefreshToken(installation.user_id!)}
                              disabled={refreshingUserId === installation.user_id}
                            >
                              {refreshingUserId === installation.user_id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Refresh
                                </>
                              )}
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={deletingInstallationId === installation.id}
                              >
                                {deletingInstallationId === installation.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Installation?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the HighLevel connection record for{' '}
                                  <span className="font-medium">{installation.location_name || installation.location_id || 'this location'}</span>.
                                  {installation.user_id && (
                                    <> The user will need to reinstall from the HighLevel Marketplace to reconnect.</>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteInstallation(installation.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {installations.some(i => i.refresh_error) && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some installations have refresh errors. Check the logs for details.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}