
import { useEffect, useReducer, useMemo, useRef } from 'react';
import { userManagementReducer } from './reducer';
import { initialState } from './types';
import { useUserManagementActions } from './actions';
import { useSetters } from './setters';

/**
 * USER MANAGEMENT HOOK - Client-Side Search Architecture
 * 
 * CURRENT IMPLEMENTATION (Option A - Client-Side):
 * - Loads ALL users once on initial connection
 * - Filters and paginates entirely client-side
 * - Optimal for < 500 users
 * 
 * FUTURE UPGRADE PATH (Option B - Server-Side):
 * If user count exceeds 500, switch to server-side search:
 * 1. Restore useDebounce for searchQuery (currently removed)
 * 2. Re-enable API calls in executeSearch when searchQuery changes
 * 3. Update searchUsers edge function to use proper database filtering
 * 4. Consider implementing cursor-based pagination for better performance
 * 
 * See: supabase/functions/admin-users/handlers/searchUsers.ts
 */

export function useUserManagement() {
  const [state, dispatch] = useReducer(userManagementReducer, initialState);
  const hasFetchedInitialUsers = useRef(false);

  // Get action handlers - pass empty string since we do client-side filtering now
  const {
    executeSearch,
    checkConnection,
    confirmRoleUpdate,
    resetEnvironmentConfig,
    reinitializeConnection
  } = useUserManagementActions(state, dispatch, ''); // No server-side search query

  // Get setter functions
  const {
    setSelectedUser,
    setDialog,
    setCurrentPage,
    setPageSize,
    setSearchQuery,
    setRoleFilter,
    clearFilters
  } = useSetters(dispatch);

  // CLIENT-SIDE FILTERING: Filter users based on search query and role
  // This provides instant feedback without API calls
  const filteredUsers = useMemo(() => {
    let result = state.users;
    
    // Apply search filter
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      result = result.filter(user => 
        user.email?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
      );
    }
    
    // Apply role filter
    if (state.roleFilter && state.roleFilter !== 'all') {
      result = result.filter(user => user.role === state.roleFilter);
    }
    
    return result;
  }, [state.users, state.searchQuery, state.roleFilter]);

  // CLIENT-SIDE PAGINATION: Calculate paginated subset
  const paginatedUsers = useMemo(() => {
    const startIndex = (state.currentPage - 1) * state.pageSize;
    return filteredUsers.slice(startIndex, startIndex + state.pageSize);
  }, [filteredUsers, state.currentPage, state.pageSize]);

  // Calculate total pages based on filtered results
  const calculatedTotalPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / state.pageSize) || 1;
  }, [filteredUsers.length, state.pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (state.currentPage > calculatedTotalPages) {
      dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 });
    }
  }, [state.searchQuery, state.roleFilter, calculatedTotalPages]);

  // Universal fetcher - now only used for refresh
  const fetchAndSetUsers = async (_isSearch = false) => {
    await executeSearch(false);
  };

  // RACE CONDITION FIX: Fetch users when connection becomes available
  useEffect(() => {
    if (
      state.connectionStatus?.isConnected && 
      state.connectionStatus?.functionAvailable && 
      !hasFetchedInitialUsers.current &&
      !state.loading
    ) {
      hasFetchedInitialUsers.current = true;
      executeSearch(false);
    }
  }, [state.connectionStatus?.isConnected, state.connectionStatus?.functionAvailable]);

  // Check connection status on component mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    users: paginatedUsers, // Client-side paginated results
    allUsers: state.users, // Full user list (for future use)
    filteredCount: filteredUsers.length, // Total matching filter
    loading: state.loading,
    error: state.error,
    connectionStatus: state.connectionStatus,
    selectedUser: state.selectedUser,
    dialog: state.dialog,
    updatingUserId: state.updatingUserId,
    currentPage: state.currentPage,
    totalPages: calculatedTotalPages, // Client-side calculated
    pageSize: state.pageSize,
    searchQuery: state.searchQuery,
    roleFilter: state.roleFilter,
    validationErrors: state.validationErrors,
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
