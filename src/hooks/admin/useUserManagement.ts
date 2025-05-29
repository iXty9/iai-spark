
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
  const [updatingRole, setUpdatingRole] = useState(false);

  // Pagination + Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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
      executeSearch(true); // Always reset to page 1 for search
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
        
        // If there are connection issues, show appropriate error
        if (!status.isConnected) {
          setError('Database connection error. Please check your Supabase configuration.');
        } else if (!status.isAuthenticated) {
          setError('Authentication error. Please sign in again.');
        } else if (!status.isAdmin) {
          setError('Access denied. You do not have admin privileges.');
        } else {
          // Only fetch users if connection status is good - will be handled by other effects
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

  // Role update with optimistic updates
  const confirmRoleUpdate = async (role: UserRole) => {
    if (!selectedUser) return;
    
    setUpdatingRole(true);
    
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
        title: "User role updated",
        description: `${selectedUser.email} is now a${role === 'admin' ? 'n' : ''} ${role}.`,
      });
    } catch (e: any) {
      // Rollback optimistic update
      setUsers(previousUsers);
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
    updatingRole,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    fetchAndSetUsers,
    confirmRoleUpdate,
    resetEnvironmentConfig,
    reinitializeConnection
  };
}
