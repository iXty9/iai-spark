import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  UserWithRole, UserRole,
  fetchUsers, updateUserRole, searchUsers
} from '@/services/admin/userRolesService';
import { UsersTable } from './users/UsersTable';
import { PromoteDialog, DemoteDialog } from './users/RoleDialogs';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle, Loader, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function UserManagement() {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialog, setDialog] = useState<"promote" | "demote" | null>(null);
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

  useEffect(() => { fetchAndSetUsers(false); }, [fetchAndSetUsers]);

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
        <Button onClick={() => fetchAndSetUsers(false)} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
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
    </div>
  );
}