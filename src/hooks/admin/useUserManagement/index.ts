
import { useEffect, useReducer } from 'react';
import { useDebounce } from '../useDebounce';
import { userManagementReducer } from './reducer';
import { initialState } from './types';
import { useUserManagementActions } from './actions';
import { useSetters } from './setters';

export function useUserManagement() {
  const [state, dispatch] = useReducer(userManagementReducer, initialState);
  
  // Debounced search query
  const debouncedSearchQuery = useDebounce(state.searchQuery, 500);

  // Get action handlers
  const {
    executeSearch,
    checkConnection,
    confirmRoleUpdate,
    resetEnvironmentConfig,
    reinitializeConnection
  } = useUserManagementActions(state, dispatch, debouncedSearchQuery);

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

  // Universal fetcher with improved logic
  const fetchAndSetUsers = async (isSearch = false) => {
    await executeSearch(isSearch);
  };

  // Effect for debounced search with validation
  useEffect(() => {
    if (state.connectionStatus?.isConnected && state.connectionStatus?.functionAvailable) {
      executeSearch(true);
    }
  }, [debouncedSearchQuery, executeSearch, state.connectionStatus]);

  // Effect for pagination and filters (not search)
  useEffect(() => {
    if (state.connectionStatus?.isConnected && state.connectionStatus?.functionAvailable && !debouncedSearchQuery) {
      executeSearch(false);
    }
  }, [state.currentPage, state.pageSize, state.roleFilter, executeSearch, state.connectionStatus]);

  // Check connection status on component mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    users: state.users,
    loading: state.loading,
    error: state.error,
    connectionStatus: state.connectionStatus,
    selectedUser: state.selectedUser,
    dialog: state.dialog,
    updatingUserId: state.updatingUserId,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
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
