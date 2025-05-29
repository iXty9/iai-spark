
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/services/admin/types/userTypes';
import { 
  fetchUsers, 
  searchUsers, 
  updateUserRole, 
  checkAdminConnectionStatus 
} from '@/services/admin/edgeFunctionUserService';
import { clearAllEnvironmentConfigs } from '@/config/supabase-config';
import { validateSearchParams, sanitizeSearchQuery, normalizeRole } from '@/utils/validation';

interface UseUserManagementActionsProps {
  users: any[];
  setUsers: (users: any[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnectionStatus: (status: any) => void;
  setDialog: (dialog: any) => void;
  setUpdatingUserId: (id: string | null) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  setValidationErrors: (errors: Record<string, string>) => void;
  currentPage: number;
  pageSize: number;
  roleFilter: string;
  debouncedSearchQuery: string;
  connectionStatus: any;
  selectedUser: any;
  updatingUserId: string | null;
}

export function useUserManagementActions({
  users,
  setUsers,
  setLoading,
  setError,
  setConnectionStatus,
  setDialog,
  setUpdatingUserId,
  setCurrentPage,
  setTotalPages,
  setValidationErrors,
  currentPage,
  pageSize,
  roleFilter,
  debouncedSearchQuery,
  connectionStatus,
  selectedUser,
  updatingUserId
}: UseUserManagementActionsProps) {
  const { toast } = useToast();

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
  }, [setValidationErrors]);

  // Clear filters function with validation
  const clearFilters = useCallback(() => {
    setUsers([]);
    setCurrentPage(1);
    setValidationErrors({});
  }, [setUsers, setCurrentPage, setValidationErrors]);

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

      let result;
      
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
  }, [debouncedSearchQuery, currentPage, pageSize, roleFilter, toast, validateParams, setLoading, setError, setUsers, setTotalPages, setCurrentPage]);

  // Universal fetcher with improved logic
  const fetchAndSetUsers = useCallback(async (isSearch = false) => {
    await executeSearch(isSearch);
  }, [executeSearch]);

  // Check connection status
  const checkConnection = useCallback(async () => {
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
  }, [setConnectionStatus, setError, setLoading]);

  // Enhanced role update with comprehensive validation and optimistic updates
  const confirmRoleUpdate = useCallback(async (role: UserRole) => {
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
    setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
    
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
    }
  }, [selectedUser, users, setUsers, setUpdatingUserId, setDialog, toast]);
  
  // Reset environment configuration with validation
  const resetEnvironmentConfig = useCallback(() => {
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
  }, [toast, setDialog]);

  const reinitializeConnection = useCallback(() => {
    setDialog(null);
    window.location.href = window.location.pathname + "?force_init=true";
  }, [setDialog]);

  return {
    clearFilters,
    fetchAndSetUsers,
    confirmRoleUpdate,
    resetEnvironmentConfig,
    reinitializeConnection,
    checkConnection,
    executeSearch
  };
}
