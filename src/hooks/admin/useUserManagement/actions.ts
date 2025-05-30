
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
import { UserManagementState, UserManagementAction } from './types';
import { useValidation } from './validation';

export function useUserManagementActions(
  state: UserManagementState,
  dispatch: React.Dispatch<UserManagementAction>,
  debouncedSearchQuery: string
) {
  const { toast } = useToast();
  const { validateParams, sanitizeSearchQuery, normalizeRole } = useValidation(dispatch);

  const executeSearch = useCallback(async (isSearch: boolean = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const params = {
        searchQuery: debouncedSearchQuery,
        page: isSearch ? 1 : state.currentPage,
        pageSize: state.pageSize,
        roleFilter: state.roleFilter !== 'all' ? state.roleFilter : undefined,
      };

      if (!validateParams(params)) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const options = {
        page: isSearch ? 1 : state.currentPage,
        pageSize: state.pageSize,
        roleFilter: state.roleFilter !== 'all' ? normalizeRole(state.roleFilter) : undefined,
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

      dispatch({ type: 'SET_USERS', payload: result.users });
      dispatch({ type: 'SET_TOTAL_PAGES', payload: Math.ceil(result.totalCount / state.pageSize) || 1 });
      
      if (isSearch) {
        dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 });
      }
    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to load users.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast({
        variant: "destructive",
        title: "Failed to load users",
        description: errorMessage,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [debouncedSearchQuery, state.currentPage, state.pageSize, state.roleFilter, toast, validateParams, sanitizeSearchQuery, normalizeRole]);

  const checkConnection = useCallback(async () => {
    try {
      const status = await checkAdminConnectionStatus();
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
      
      if (!status.isConnected) {
        dispatch({ type: 'SET_ERROR', payload: 'Edge function connection error. Please check your configuration.' });
      } else if (!status.functionAvailable) {
        dispatch({ type: 'SET_ERROR', payload: 'Admin functions not available. Please check your edge function deployment.' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: null });
      }
    } catch (e) {
      console.error("Error checking connection status:", e);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to check connection status. Please try again.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const confirmRoleUpdate = useCallback(async (role: UserRole) => {
    if (!state.selectedUser) return;
    
    const normalizedRole = normalizeRole(role);
    if (!['admin', 'moderator', 'user'].includes(normalizedRole)) {
      toast({
        variant: "destructive",
        title: "Invalid role",
        description: "Please select a valid role.",
      });
      return;
    }
    
    dispatch({ type: 'SET_UPDATING_USER_ID', payload: state.selectedUser.id });
    
    const previousUsers = [...state.users];
    const updatedUser = { ...state.selectedUser, role: normalizedRole as UserRole };
    dispatch({ type: 'SET_USERS', payload: state.users.map(u => u.id === state.selectedUser!.id ? updatedUser : u) });
    
    try {
      const success = await updateUserRole(state.selectedUser.id, normalizedRole as UserRole);
      
      if (!success) {
        dispatch({ type: 'SET_USERS', payload: previousUsers });
        throw new Error('Failed to update user role');
      }
      
      toast({
        title: "Role updated successfully",
        description: `User is now ${normalizedRole === 'admin' ? 'an admin' : normalizedRole === 'moderator' ? 'a moderator' : 'a user'}.`,
      });
    } catch (e: any) {
      dispatch({ type: 'SET_USERS', payload: previousUsers });
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: e?.message || "There was an error updating the user role.",
      });
    } finally {
      dispatch({ type: 'SET_UPDATING_USER_ID', payload: null });
      dispatch({ type: 'SET_DIALOG', payload: null });
    }
  }, [state.selectedUser, state.users, toast, normalizeRole, dispatch]);

  const resetEnvironmentConfig = useCallback(() => {
    try {
      clearAllEnvironmentConfigs();
      toast({
        title: "Configuration Reset",
        description: "All environment-specific configurations have been cleared. Please refresh the page.",
      });
      dispatch({ type: 'SET_DIALOG', payload: null });
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
  }, [toast, dispatch]);

  const reinitializeConnection = useCallback(() => {
    dispatch({ type: 'SET_DIALOG', payload: null });
    window.location.href = window.location.pathname + "?force_init=true";
  }, [dispatch]);

  return {
    executeSearch,
    checkConnection,
    confirmRoleUpdate,
    resetEnvironmentConfig,
    reinitializeConnection
  };
}
