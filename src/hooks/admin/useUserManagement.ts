
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  UserWithRole, UserRole, UsersFetchOptions, UsersSearchOptions, UsersFetchResult
} from '@/services/admin/types/userTypes';
import { fetchUsers, searchUsers, updateUserRole, checkAdminConnectionStatus } from '@/services/admin/userService';
import { checkIsAdmin } from '@/services/admin/userRolesService';
import { clearAllEnvironmentConfigs } from '@/config/supabase-config';

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useUserManagement() {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialog, setDialog] = useState<"promote" | "demote" | "environment" | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Pagination + Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Clear filters function
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setRoleFilter('all');
    setCurrentPage(1);
  }, []);

  // Memoized search function to prevent unnecessary re-renders
  const executeSearch = useCallback(async (isSearch: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const options = {
        page: isSearch ? 1 : currentPage,
        pageSize,
        roleFilter: roleFilter !== 'all' ? roleFilter as UserRole : undefined,
      };

      let result: UsersFetchResult;
      
      if (debouncedSearchQuery.trim()) {
        result = await searchUsers({
          ...options,
          searchQuery: debouncedSearchQuery,
        });
      } else {
        result = await fetchUsers(options);
      }

      setUsers(result.users);
      setTotalPages(Math.ceil(result.totalCount / pageSize) || 1);
      
      if (isSearch) {
        setCurrentPage(1);
      }
    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to load users.';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Failed to load users",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, currentPage, pageSize, roleFilter, toast]);

  // Universal fetcher with improved logic
  const fetchAndSetUsers = useCallback(async (isSearch = false) => {
    await executeSearch(isSearch);
  }, [executeSearch]);

  // Effect for debounced search
  useEffect(() => {
    if (connectionStatus?.isConnected && connectionStatus?.isAdmin) {
      executeSearch(true);
    }
  }, [debouncedSearchQuery, executeSearch, connectionStatus]);

  // Effect for pagination and filters (not search)
  useEffect(() => {
    if (connectionStatus?.isConnected && connectionStatus?.isAdmin && !debouncedSearchQuery) {
      executeSearch(false);
    }
  }, [currentPage, pageSize, roleFilter, executeSearch, connectionStatus]);

  // Check connection status on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await checkAdminConnectionStatus();
        setConnectionStatus(status);
        
        if (!status.isConnected) {
          setError('Database connection error. Please check your Supabase configuration.');
        } else if (!status.isAuthenticated) {
          setError('Authentication error. Please sign in again.');
        } else if (!status.isAdmin) {
          setError('Access denied. You do not have admin privileges.');
        } else {
          setError(null);
        }
      } catch (e) {
        console.error("Error checking connection status:", e);
        setError('Failed to check connection status. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    checkConnection();
  }, []);

  // Role update with optimistic updates and better UX
  const confirmRoleUpdate = async (role: UserRole) => {
    if (!selectedUser) return;
    
    setUpdatingUserId(selectedUser.id);
    
    // Optimistic update
    const previousUsers = [...users];
    setUsers(users =>
      users.map(u => u.id === selectedUser.id ? { ...u, role } : u));
    
    try {
      const success = await updateUserRole(selectedUser.id, role);
      
      if (!success) {
        // Rollback optimistic update
        setUsers(previousUsers);
        throw new Error('Failed to update user role');
      }
      
      toast({
        title: "Role updated successfully",
        description: `${selectedUser.email} is now ${role === 'admin' ? 'an admin' : role === 'moderator' ? 'a moderator' : 'a user'}.`,
      });
    } catch (e: any) {
      // Rollback optimistic update
      setUsers(previousUsers);
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: e?.message || "There was an error updating the user role.",
      });
    } finally {
      setUpdatingUserId(null);
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
    setDialog(null);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const reinitializeConnection = useCallback(() => {
    setDialog(null);
    window.location.href = window.location.pathname + "?force_init=true";
  }, []);

  return {
    users,
    loading,
    error,
    connectionStatus,
    selectedUser,
    setSelectedUser,
    dialog,
    setDialog,
    updatingUserId,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    clearFilters,
    fetchAndSetUsers,
    confirmRoleUpdate,
    resetEnvironmentConfig,
    reinitializeConnection
  };
}
