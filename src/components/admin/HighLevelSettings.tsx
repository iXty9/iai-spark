import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Copy, CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

interface GHLInstallation {
  id: string;
  user_id: string;
  location_id: string | null;
  location_name: string | null;
  company_id: string | null;
  company_name: string | null;
  scopes: string | null;
  connection_status: 'connected' | 'expired' | 'error' | 'disconnected';
  connected_at: string;
  last_refresh_at: string | null;
  token_expires_at: string;
  refresh_error: string | null;
  // Joined user email
  user_email?: string;
}

export function HighLevelSettings() {
  const { toast } = useToast();
  const [installations, setInstallations] = useState<GHLInstallation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingUserId, setRefreshingUserId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // OAuth callback URL for GHL app configuration
  const callbackUrl = `${window.location.origin}/oauth`;

  useEffect(() => {
    fetchInstallations();
  }, []);

  const fetchInstallations = async () => {
    setIsLoading(true);
    try {
      // Fetch installations - admins can see all due to RLS
      const { data, error } = await supabase
        .from('ghl_installations')
        .select('*')
        .order('connected_at', { ascending: false });

      if (error) throw error;
      
      // We'll display installations without joining to auth.users
      // since that table isn't accessible via public API
      setInstallations(data || []);
    } catch (error) {
      console.error('Error fetching installations:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load HighLevel installations',
      });
    } finally {
      setIsLoading(false);
    }
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
      await fetchInstallations();
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
    const now = new Date();
    const expiresAt = new Date(installation.token_expires_at);
    const isExpiringSoon = expiresAt.getTime() - now.getTime() < 60 * 60 * 1000; // 1 hour

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
    const expiring = installations.filter(i => {
      const expiresAt = new Date(i.token_expires_at);
      const now = new Date();
      return i.connection_status === 'connected' && expiresAt.getTime() - now.getTime() < 60 * 60 * 1000;
    }).length;
    const failed = installations.filter(i => i.connection_status === 'error' || i.connection_status === 'expired').length;
    
    return { healthy: healthy - expiring, expiring, failed };
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
          <div className="space-y-2">
            <Label htmlFor="callback-url">OAuth Callback URL</Label>
            <div className="flex gap-2">
              <Input
                id="callback-url"
                value={callbackUrl}
                readOnly
                className="font-mono text-sm"
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
              GHL Client ID and Secret are stored securely as Supabase Edge Function secrets. 
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

      {/* Health Summary */}
      <Card className="bg-background/60">
        <CardHeader>
          <CardTitle className="text-lg">Connection Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
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
          <Button variant="outline" size="sm" onClick={fetchInstallations}>
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
                        {installation.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {installation.location_name || installation.location_id || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(installation)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(installation.token_expires_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(installation.connected_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRefreshToken(installation.user_id)}
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