
import { useCallback } from 'react';
import { UserWithRole } from '@/services/admin/types/userTypes';
import { UserManagementAction } from './types';

export function useSetters(dispatch: React.Dispatch<UserManagementAction>) {
  const setSelectedUser = useCallback((user: UserWithRole | null) => {
    dispatch({ type: 'SET_SELECTED_USER', payload: user });
  }, [dispatch]);

  const setDialog = useCallback((dialog: "promote" | "demote" | "environment" | null) => {
    dispatch({ type: 'SET_DIALOG', payload: dialog });
  }, [dispatch]);

  const setCurrentPage = useCallback((page: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  }, [dispatch]);

  const setPageSize = useCallback((size: number) => {
    dispatch({ type: 'SET_PAGE_SIZE', payload: size });
  }, [dispatch]);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, [dispatch]);

  const setRoleFilter = useCallback((filter: string) => {
    dispatch({ type: 'SET_ROLE_FILTER', payload: filter });
  }, [dispatch]);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, [dispatch]);

  return {
    setSelectedUser,
    setDialog,
    setCurrentPage,
    setPageSize,
    setSearchQuery,
    setRoleFilter,
    clearFilters
  };
}
