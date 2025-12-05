
import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/services/admin/types/userTypes';
import { 
  fetchUsers, 
  updateUserRole, 
  checkAdminConnectionStatus 
} from '@/services/admin/edgeFunctionUserService';
import { clearAllEnvironmentConfigs } from '@/config/supabase-config';
import { UserManagementState, UserManagementAction } from './types';
import { useValidation } from './validation';

/**
 * SCALABILITY NOTE:
 * Currently loads ALL users (up to 500) for client-side filtering.
 * 
 * If user count exceeds 500, re-enable server-side search:
 * 1. Import searchUsers from edgeFunctionUserService
 * 2. Restore debouncedSearchQuery parameter usage
 * 3. Call searchUsers API when query is present
 * 4. Update MAX_USERS_FOR_CLIENT_SIDE below
 */
const MAX_USERS_FOR_CLIENT_SIDE = 500;

export function useUserManagementActions(
  state: UserManagementState,
  dispatch: React.Dispatch<UserManagementAction>,
  _debouncedSearchQuery: string // Kept for future server-side search upgrade
) {
  const { toast } = useToast();
  const { validateParams, normalizeRole } = useValidation(dispatch);
  
  // Request deduplication - useRef persists across renders
  const currentRequestIdRef = useRef(0);

  // Fetch ALL users for client-side filtering
  const executeSearch = useCallback(async (_isSearch: boolean = false) => {
    const requestId = ++currentRequestIdRef.current;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      // Load all users at once for client-side filtering
      // FUTURE: If totalCount > MAX_USERS_FOR_CLIENT_SIDE, switch to server-side search
      const result = await fetchUsers({
        page: 1,
        pageSize: MAX_USERS_FOR_CLIENT_SIDE,
        roleFilter: undefined, // Load all roles, filter client-side
      });

      // Check if this request is still current (prevents stale updates)
      if (requestId !== currentRequestIdRef.current) return;

      dispatch({ type: 'SET_USERS', payload: result.users });
      // Total pages calculated client-side in useUserManagement hook
      dispatch({ type: 'SET_TOTAL_PAGES', payload: Math.ceil(result.totalCount / state.pageSize) || 1 });
      
      // Log warning if approaching limit
      if (result.totalCount > MAX_USERS_FOR_CLIENT_SIDE * 0.8) {
        console.warn(
          `[UserManagement] User count (${result.totalCount}) approaching client-side limit (${MAX_USERS_FOR_CLIENT_SIDE}). ` +
          `Consider upgrading to server-side search. See useUserManagementActions.ts for instructions.`
        );
      }
    } catch (e: any) {
      // Check if this request is still current before setting error
      if (requestId !== currentRequestIdRef.current) return;
      
      const errorMessage = e?.message || 'Failed to load users.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast({
        variant: "destructive",
        title: "Failed to load users",
        description: errorMessage,
      });
    } finally {
      // Only clear loading if this is still the current request
      if (requestId === currentRequestIdRef.current) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, [state.pageSize, dispatch, toast]);

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
