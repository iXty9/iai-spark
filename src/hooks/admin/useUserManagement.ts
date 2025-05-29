
import { useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { useUserManagementState } from './useUserManagementState';
import { useUserManagementActions } from './useUserManagementActions';

export function useUserManagement() {
  const state = useUserManagementState();
  const {
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
    validationErrors,
    setUsers,
    setLoading,
    setError,
    setConnectionStatus,
    setSelectedUser,
    setDialog,
    setUpdatingUserId,
    setCurrentPage,
    setTotalPages,
    setPageSize,
    setSearchQuery,
    setRoleFilter,
    setValidationErrors
  } = state;

  // Debounced search query with validation
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const actions = useUserManagementActions({
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
  });

  // Effect for debounced search with validation
  useEffect(() => {
    if (connectionStatus?.isConnected && connectionStatus?.functionAvailable) {
      actions.executeSearch(true);
    }
  }, [debouncedSearchQuery, actions.executeSearch, connectionStatus]);

  // Effect for pagination and filters (not search)
  useEffect(() => {
    if (connectionStatus?.isConnected && connectionStatus?.functionAvailable && !debouncedSearchQuery) {
      actions.executeSearch(false);
    }
  }, [currentPage, pageSize, roleFilter, actions.executeSearch, connectionStatus]);

  // Check connection status on component mount
  useEffect(() => {
    actions.checkConnection();
  }, [actions.checkConnection]);

  return {
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
    validationErrors,
    setSelectedUser,
    setDialog,
    setCurrentPage,
    setPageSize,
    setSearchQuery,
    setRoleFilter,
    clearFilters: actions.clearFilters,
    fetchAndSetUsers: actions.fetchAndSetUsers,
    confirmRoleUpdate: actions.confirmRoleUpdate,
    resetEnvironmentConfig: actions.resetEnvironmentConfig,
    reinitializeConnection: actions.reinitializeConnection
  };
}
