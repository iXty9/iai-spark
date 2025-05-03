
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  UserWithRole,
  UserRole,
  fetchUsers,
  updateUserRole,
  searchUsers
} from '@/services/admin/userRolesService';
import { UsersTable } from './users/UsersTable';
import { PromoteDialog, DemoteDialog } from './users/RoleDialogs';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Search, Filter, AlertTriangle, Loader } from 'lucide-react';
import { PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showDemoteDialog, setShowDemoteDialog] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, [currentPage, pageSize, roleFilter]);

  const loadUsers = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      console.log(`Loading users: page=${currentPage}, size=${pageSize}, role=${roleFilter}`);
      const { users: usersData, totalCount } = await fetchUsers({
        page: currentPage,
        pageSize,
        roleFilter: roleFilter !== 'all' ? roleFilter as UserRole : undefined
      });
      
      console.log(`Loaded ${usersData.length} users out of ${totalCount} total`);
      setUsers(usersData);
      setTotalPages(Math.ceil(totalCount / pageSize) || 1);
    } catch (error) {
      console.error('Error loading users:', error);
      setIsError(true);
      toast({
        variant: "destructive",
        title: "Failed to load users",
        description: "There was an error loading user data. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      console.log(`Searching users: query=${searchQuery}, page=1, size=${pageSize}, role=${roleFilter}`);
      const { users: searchResults, totalCount } = await searchUsers({
        searchQuery,
        page: 1, // Reset to first page on search
        pageSize,
        roleFilter: roleFilter !== 'all' ? roleFilter as UserRole : undefined
      });
      
      console.log(`Search found ${searchResults.length} users out of ${totalCount} total`);
      setUsers(searchResults);
      setTotalPages(Math.ceil(totalCount / pageSize) || 1);
      setCurrentPage(1); // Reset to first page
    } catch (error) {
      console.error('Error searching users:', error);
      setIsError(true);
      toast({
        variant: "destructive",
        title: "Search failed",
        description: "There was an error searching for users. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromoteUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowPromoteDialog(true);
  };

  const handleDemoteUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowDemoteDialog(true);
  };

  const confirmRoleUpdate = async (role: UserRole) => {
    if (!selectedUser) return;
    
    setIsUpdatingRole(true);
    try {
      console.log(`Updating user ${selectedUser.email} to role ${role}`);
      await updateUserRole(selectedUser.id, role);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id ? { ...user, role } : user
        )
      );
      
      toast({
        title: "User role updated",
        description: `${selectedUser.email} is now a${role === 'admin' ? 'n' : ''} ${role}.`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        variant: "destructive",
        title: "Failed to update user role",
        description: "There was an error updating the user role. Please try again.",
      });
    } finally {
      setIsUpdatingRole(false);
      setShowPromoteDialog(false);
      setShowDemoteDialog(false);
      setSelectedUser(null);
    }
  };

  // Handle page change
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRetry = () => {
    loadUsers();
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => goToPage(currentPage - 1)}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => goToPage(1)}>1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <span className="px-2">...</span>
                </PaginationItem>
              )}
            </>
          )}
          
          {pages.map(page => (
            <PaginationItem key={page}>
              <PaginationLink 
                isActive={currentPage === page}
                onClick={() => goToPage(page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <span className="px-2">...</span>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink onClick={() => goToPage(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => goToPage(currentPage + 1)}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  // Show initial loading state
  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <Skeleton className="h-10 w-full" />
            </div>
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
  }

  // Show error state
  if (isError) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Failed to load users</h3>
          <p className="mb-6 text-muted-foreground">There was a problem loading the user data.</p>
          <Button onClick={handleRetry}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch}>
            Search
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 per page</SelectItem>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <UsersTable 
        users={users}
        onPromoteUser={handlePromoteUser}
        onDemoteUser={handleDemoteUser}
        isLoading={isLoading}
      />
      
      {totalPages > 1 && renderPagination()}
      
      <PromoteDialog 
        user={selectedUser}
        isUpdating={isUpdatingRole}
        isOpen={showPromoteDialog}
        onOpenChange={setShowPromoteDialog}
        onConfirm={() => confirmRoleUpdate('admin')}
      />
      
      <DemoteDialog 
        user={selectedUser}
        isUpdating={isUpdatingRole}
        isOpen={showDemoteDialog}
        onOpenChange={setShowDemoteDialog}
        onConfirm={() => confirmRoleUpdate('user')}
      />
    </div>
  );
}
