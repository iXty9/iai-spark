
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  UserWithRole, UserRole, UsersFetchOptions, UsersSearchOptions, UsersFetchResult
} from '@/services/admin/types/userTypes';
import { 
  fetchUsers, 
  searchUsers, 
  updateUserRole, 
  checkAdminConnectionStatus 
} from '@/services/admin/edgeFunctionUserService';
import { checkIsAdmin } from '@/services/admin/userRolesService';
import { clearAllEnvironmentConfigs } from '@/config/supabase-config';
import { validateSearchParams, sanitizeSearchQuery, normalizeRole } from '@/utils/validation';

// Debounce hook for search with validation
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

// Enhanced state management hook
export function useUserManagement() {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialog, setDialog] = useState<"promote" | "demote" | "environment" | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Pagination + Filter with validation
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Form validation states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Debounced search query with validation
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Validate search parameters
  const validateParams = useCallback((params: any) => {
    const validation = validateSearchParams(params);
    if (!validation.success) {
      setValidationErrors(
        validation.errors?.reduce((acc, err) => ({ ...acc, [err.field]: err.message }), {}) || {}
      );
      return false;
    }
    setValidationErrors({});
    return true;
  }, []);

  // Clear filters function with validation
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setRoleFilter('all');
    setCurrentPage(1);
    setValidationErrors({});
  }, []);

  // Enhanced search execution with comprehensive error handling
  const executeSearch = useCallback(async (isSearch: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate parameters before making request
      const params = {
        searchQuery: debouncedSearchQuery,
        page: isSearch ? 1 : currentPage,
        pageSize,
        roleFilter: roleFilter !== 'all' ? roleFilter : undefined,
      };

      if (!validateParams(params)) {
        setLoading(false);
        return;
      }

      const options = {
        page: isSearch ? 1 : currentPage,
        pageSize,
        roleFilter: roleFilter !== 'all' ? normalizeRole(roleFilter) : undefined,
      };

      let result: UsersFetchResult;
      
      if (debouncedSearchQuery.trim()) {
        const sanitizedQuery = sanitizeSearchQuery(debouncedSearchQuery);
        result = await searchUsers({
          ...options,
          searchQuery: sanitizedQuery,
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
  }, [debouncedSearchQuery, currentPage, pageSize, roleFilter, toast, validateParams]);

  // Universal fetcher with improved logic
  const fetchAndSetUsers = useCallback(async (isSearch = false) => {
    await executeSearch(isSearch);
  }, [executeSearch]);

  // Effect for debounced search with validation
  useEffect(() => {
    if (connectionStatus?.isConnected && connectionStatus?.functionAvailable) {
      executeSearch(true);
    }
  }, [debouncedSearchQuery, executeSearch, connectionStatus]);

  // Effect for pagination and filters (not search)
  useEffect(() => {
    if (connectionStatus?.isConnected && connectionStatus?.functionAvailable && !debouncedSearchQuery) {
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
          setError('Edge function connection error. Please check your configuration.');
        } else if (!status.functionAvailable) {
          setError('Admin functions not available. Please check your edge function deployment.');
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

  // Enhanced role update with comprehensive validation and optimistic updates
  const confirmRoleUpdate = async (role: UserRole) => {
    if (!selectedUser) return;
    
    // Validate role
    const normalizedRole = normalizeRole(role);
    if (!['admin', 'moderator', 'user'].includes(normalizedRole)) {
      toast({
        variant: "destructive",
        title: "Invalid role",
        description: "Please select a valid role.",
      });
      return;
    }
    
    setUpdatingUserId(selectedUser.id);
    
    // Optimistic update with validation
    const previousUsers = [...users];
    const updatedUser = { ...selectedUser, role: normalizedRole as UserRole };
    setUsers(users =>
      users.map(u => u.id === selectedUser.id ? updatedUser : u));
    
    try {
      const success = await updateUserRole(selectedUser.id, normalizedRole as UserRole);
      
      if (!success) {
        // Rollback optimistic update
        setUsers(previousUsers);
        throw new Error('Failed to update user role');
      }
      
      toast({
        title: "Role updated successfully",
        description: `User is now ${normalizedRole === 'admin' ? 'an admin' : normalizedRole === 'moderator' ? 'a moderator' : 'a user'}.`,
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
  
  // Reset environment configuration with validation
  const resetEnvironmentConfig = () => {
    try {
      clearAllEnvironmentConfigs();
      toast({
        title: "Configuration Reset",
        description: "All environment-specific configurations have been cleared. Please refresh the page.",
      });
      setDialog(null);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: "Failed to reset configuration. Please try again.",
      });
    }
  };

  const reinitializeConnection = useCallback(() => {
    setDialog(null);
    window.location.href = window.location.pathname + "?force_init=true";
  }, []);

  // Memoized values for performance
  const memoizedValues = useMemo(() => ({
    users,
    loading,
    error,
    connectionStatus,
    selectedUser,
    dialog,
    updatingUserId,
    currentPage,
    totalPages,
    pageSize,
    searchQuery,
    roleFilter,
    validationErrors
  }), [
    users,
    loading,
    error,
    connectionStatus,
    selectedUser,
    dialog,
    updatingUserId,
    currentPage,
    totalPages,
    pageSize,
    searchQuery,
    roleFilter,
    validationErrors
  ]);

  return {
    ...memoizedValues,
    setSelectedUser,
    setDialog,
    setCurrentPage,
    setPageSize,
    setSearchQuery,
    setRoleFilter,
    clearFilters,
    fetchAndSetUsers,
    confirmRoleUpdate,
    resetEnvironmentConfig,
    reinitializeConnection
  };
}
