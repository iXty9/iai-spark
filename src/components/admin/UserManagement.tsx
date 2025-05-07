
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  UserWithRole, UserRole,
  fetchUsers, updateUserRole, searchUsers, checkAdminConnectionStatus
} from '@/services/admin/userRolesService';
import { UsersTable } from './users/UsersTable';
import { PromoteDialog, DemoteDialog } from './users/RoleDialogs';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle, Loader, RefreshCw, Info, Settings, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { clearAllEnvironmentConfigs } from '@/config/supabase-config';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function UserManagement() {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialog, setDialog] = useState<"promote" | "demote" | "environment" | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Pagination + Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Universal fetcher
  const fetchAndSetUsers = useCallback(async (search = false) => {
    setLoading(true);
    setError(null);
    try {
      const fn = search ? searchUsers : fetchUsers;
      const { users: usersData, totalCount } = await fn({
        searchQuery,
        page: search ? 1 : currentPage,
        pageSize,
        roleFilter: roleFilter !== 'all' ? roleFilter as UserRole : undefined,
      });
      setUsers(usersData);
      setTotalPages(Math.ceil(totalCount / pageSize) || 1);
      if (search) setCurrentPage(1);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users.');
      toast({
        variant: "destructive",
        title: search ? "Search failed" : "Failed to load users",
        description: search
          ? "Error searching users. Please check your connection and try again."
          : "Error loading user data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, pageSize, roleFilter, toast]);

  // Check connection status on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await checkAdminConnectionStatus();
        setConnectionStatus(status);
        
        // If there are connection issues, show appropriate error
        if (!status.isConnected) {
          setError('Database connection error. Please check your Supabase configuration.');
        } else if (!status.isAuthenticated) {
          setError('Authentication error. Please sign in again.');
        } else if (!status.isAdmin) {
          setError('Access denied. You do not have admin privileges.');
        } else if (!status.functionAvailable) {
          setError('Admin functions not available. This may indicate a cross-environment configuration issue.');
        } else {
          // Only fetch users if connection status is good
          fetchAndSetUsers(false);
        }
      } catch (e) {
        console.error("Error checking connection status:", e);
        setError('Failed to check connection status. Please try again.');
        setLoading(false);
      }
    };
    
    checkConnection();
  }, [fetchAndSetUsers]);

  // Role update: promote or demote
  const confirmRoleUpdate = async (role: UserRole) => {
    if (!selectedUser) return;
    setUpdatingRole(true);
    try {
      await updateUserRole(selectedUser.id, role);
      setUsers(users =>
        users.map(u => u.id === selectedUser.id ? { ...u, role } : u));
      toast({
        title: "User role updated",
        description: `${selectedUser.email} is now a${role === 'admin' ? 'n' : ''} ${role}.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Failed to update user role",
        description: e?.message || "There was an error updating the user role.",
      });
    } finally {
      setUpdatingRole(false);
      setDialog(null);
      setSelectedUser(null);
    }
  };
  
  // Reset environment configuration
  const resetEnvironmentConfig = () => {
    clearAllEnvironmentConfigs();
    toast({
      title: "Configuration Reset",
      description: "All environment-specific configurations have been cleared. Please refresh the page.",
    });
    // Close dialog
    setDialog(null);
    // Force page reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // Pagination logic (keep logic inline, since simple)
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    let page = Math.max(1, currentPage - 2) + i;
    if (page > totalPages) page = totalPages;
    return page;
  });

  if (loading && users.length === 0) return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs"><Skeleton className="h-10 w-full" /></div>
          <Skeleton className="h-10 w-16" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[110px]" />
        </div>
      </div>
      <div className="rounded-md border">
        <div className="p-6 flex flex-col items-center justify-center">
          <Loader className="h-6 w-6 animate-spin mb-2" />
          <p>Loading users...</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <Card className="p-6">
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Failed to load users</h3>
        <p className="mb-6 text-muted-foreground">{error}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => fetchAndSetUsers(false)} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
          <Button 
            onClick={() => setDialog('environment')} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" /> Environment Settings
          </Button>
        </div>
        
        {connectionStatus && (
          <div className="mt-8 text-left w-full max-w-md bg-muted/30 p-4 rounded-md text-sm">
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <Info className="h-4 w-4" /> Connection Diagnostics
            </h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>Connection: {connectionStatus.isConnected ? '✓ Connected' : '✗ Not connected'}</li>
              <li>Authentication: {connectionStatus.isAuthenticated ? '✓ Authenticated' : '✗ Not authenticated'}</li>
              <li>Admin Access: {connectionStatus.isAdmin ? '✓ Admin privileges' : '✗ No admin privileges'}</li>
              <li>Admin Functions: {connectionStatus.functionAvailable ? '✓ Available' : '✗ Not available'}</li>
              <li>Environment ID: {connectionStatus.environmentInfo?.environmentId || 'unknown'}</li>
              <li>URL: {connectionStatus.environmentInfo?.url || 'not set'}</li>
            </ul>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Environment indicator */}
      {connectionStatus && (
        <div className="flex justify-end mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground flex items-center gap-1"
                  onClick={() => setDialog('environment')}
                >
                  <Info className="h-3 w-3" />
                  <span>Environment: {connectionStatus.environmentInfo?.environmentId || 'unknown'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click for environment information and settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    
      {/* Top controls */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchAndSetUsers(true)}
              className="pl-9"
            /><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchAndSetUsers(true)} disabled={loading}>
            {loading && <Loader className="h-4 w-4 animate-spin mr-1" />} Search
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pageSize.toString()} onValueChange={v => setPageSize(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue placeholder="Page size" /></SelectTrigger>
            <SelectContent>
              {[5,10,25,50].map(n => <SelectItem key={n} value={n.toString()}>{n} per page</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchAndSetUsers(false)} disabled={loading} title="Refresh users">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <UsersTable
        users={users}
        onPromoteUser={u => { setSelectedUser(u); setDialog("promote"); }}
        onDemoteUser={u => { setSelectedUser(u); setDialog("demote"); }}
        isLoading={loading}
      />

      {/* Pagination */}
      {totalPages > 1 &&
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} />
            </PaginationItem>
            {pages[0] > 1 && (
              <>
                <PaginationItem><PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink></PaginationItem>
                {pages[0] > 2 && <PaginationItem><span className="px-2">...</span></PaginationItem>}
              </>
            )}
            {pages.map(page => (
              <PaginationItem key={page}>
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => setCurrentPage(page)}>{page}</PaginationLink>
              </PaginationItem>
            ))}
            {pages[pages.length - 1] < totalPages && (
              <>
                {pages[pages.length - 1] < totalPages - 1 &&
                  <PaginationItem><span className="px-2">...</span></PaginationItem>}
                <PaginationItem>
                  <PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink>
                </PaginationItem>
              </>
            )}
            <PaginationItem>
              <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      }

      {/* Dialogs */}
      <PromoteDialog
        user={dialog === "promote" ? selectedUser : null}
        isUpdating={updatingRole}
        isOpen={dialog === "promote"}
        onOpenChange={v => !v && setDialog(null)}
        onConfirm={() => confirmRoleUpdate('admin')}
      />
      <DemoteDialog
        user={dialog === "demote" ? selectedUser : null}
        isUpdating={updatingRole}
        isOpen={dialog === "demote"}
        onOpenChange={v => !v && setDialog(null)}
        onConfirm={() => confirmRoleUpdate('user')}
      />
      
      {/* Environment settings dialog */}
      <Dialog open={dialog === "environment"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Environment Settings</DialogTitle>
            <DialogDescription>
              Review and manage environment-specific configuration
            </DialogDescription>
          </DialogHeader>
          
          {connectionStatus && (
            <div className="space-y-4 my-2">
              <div className="border rounded-md p-4 bg-muted/20">
                <h4 className="font-medium mb-2">Connection Information</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Environment ID:</span> 
                    <span className="font-mono">{connectionStatus.environmentInfo?.environmentId}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Host:</span> 
                    <span className="font-mono">{connectionStatus.environmentInfo?.environment}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Connection ID:</span> 
                    <span className="font-mono">{connectionStatus.environmentInfo?.connectionId?.substring(0, 10)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Supabase URL:</span> 
                    <span className="font-mono text-xs truncate max-w-[220px]">{connectionStatus.environmentInfo?.url}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Last Connection:</span> 
                    <span>{new Date(connectionStatus.environmentInfo?.lastConnection).toLocaleString()}</span>
                  </li>
                </ul>
              </div>
              
              <div className="border rounded-md p-4 bg-muted/20">
                <h4 className="font-medium mb-2">Connection Status</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Database Connection:</span>
                    <span className={connectionStatus.isConnected ? "text-green-500" : "text-red-500"}>
                      {connectionStatus.isConnected ? "Connected" : "Error"}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Authentication:</span>
                    <span className={connectionStatus.isAuthenticated ? "text-green-500" : "text-red-500"}>
                      {connectionStatus.isAuthenticated ? "Authenticated" : "Not Authenticated"}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Admin Privileges:</span>
                    <span className={connectionStatus.isAdmin ? "text-green-500" : "text-red-500"}>
                      {connectionStatus.isAdmin ? "Yes" : "No"}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Edge Functions:</span>
                    <span className={connectionStatus.functionAvailable ? "text-green-500" : "text-red-500"}>
                      {connectionStatus.functionAvailable ? "Available" : "Not Available"}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setDialog(null)}
            >
              Close
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 mb-2 sm:mb-0">
              <Button
                variant="destructive"
                onClick={resetEnvironmentConfig}
              >
                Reset Configuration
              </Button>
              <Button 
                onClick={() => {
                  setDialog(null);
                  window.location.href = window.location.pathname + "?force_init=true";
                }}
              >
                Reinitialize Connection
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
