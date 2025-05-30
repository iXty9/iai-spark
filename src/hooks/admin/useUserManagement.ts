
import { useEffect, useReducer, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserRole, UserWithRole } from '@/services/admin/types/userTypes';
import { 
  fetchUsers, 
  searchUsers, 
  updateUserRole, 
  checkAdminConnectionStatus 
} from '@/services/admin/edgeFunctionUserService';
import { clearAllEnvironmentConfigs } from '@/config/supabase-config';
import { validateSearchParams, sanitizeSearchQuery, normalizeRole } from '@/utils/validation';
import { useDebounce } from './useDebounce';

interface UserManagementState {
  users: UserWithRole[];
  loading: boolean;
  error: string | null;
  connectionStatus: any;
  selectedUser: UserWithRole | null;
  dialog: "promote" | "demote" | "environment" | null;
  updatingUserId: string | null;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  searchQuery: string;
  roleFilter: string;
  validationErrors: Record<string, string>;
}

type UserManagementAction =
  | { type: 'SET_USERS'; payload: UserWithRole[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: any }
  | { type: 'SET_SELECTED_USER'; payload: UserWithRole | null }
  | { type: 'SET_DIALOG'; payload: "promote" | "demote" | "environment" | null }
  | { type: 'SET_UPDATING_USER_ID'; payload: string | null }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_TOTAL_PAGES'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_ROLE_FILTER'; payload: string }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string> }
  | { type: 'CLEAR_FILTERS' };

const initialState: UserManagementState = {
  users: [],
  loading: true,
  error: null,
  connectionStatus: null,
  selectedUser: null,
  dialog: null,
  updatingUserId: null,
  currentPage: 1,
  totalPages: 1,
  pageSize: 10,
  searchQuery: '',
  roleFilter: 'all',
  validationErrors: {}
};

function userManagementReducer(state: UserManagementState, action: UserManagementAction): UserManagementState {
  switch (action.type) {
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    case 'SET_SELECTED_USER':
      return { ...state, selectedUser: action.payload };
    case 'SET_DIALOG':
      return { ...state, dialog: action.payload };
    case 'SET_UPDATING_USER_ID':
      return { ...state, updatingUserId: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_TOTAL_PAGES':
      return { ...state, totalPages: action.payload };
    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_ROLE_FILTER':
      return { ...state, roleFilter: action.payload };
    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.payload };
    case 'CLEAR_FILTERS':
      return { ...state, users: [], currentPage: 1, validationErrors: {} };
    default:
      return state;
  }
}

export function useUserManagement() {
  const [state, dispatch] = useReducer(userManagementReducer, initialState);
  const { toast } = useToast();
  
  // Debounced search query
  const debouncedSearchQuery = useDebounce(state.searchQuery, 500);

  // Validate search parameters
  const validateParams = useCallback((params: any) => {
    const validation = validateSearchParams(params);
    if (!validation.success) {
      dispatch({
        type: 'SET_VALIDATION_ERRORS',
        payload: validation.errors?.reduce((acc, err) => ({ ...acc, [err.field]: err.message }), {}) || {}
      });
      return false;
    }
    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: {} });
    return true;
  }, []);

  // Clear filters function
  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  // Enhanced search execution with comprehensive error handling
  const executeSearch = useCallback(async (isSearch: boolean = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      // Validate parameters before making request
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
  }, [debouncedSearchQuery, state.currentPage, state.pageSize, state.roleFilter, toast, validateParams]);

  // Universal fetcher with improved logic
  const fetchAndSetUsers = useCallback(async (isSearch = false) => {
    await executeSearch(isSearch);
  }, [executeSearch]);

  // Check connection status
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
  }, []);

  // Enhanced role update with comprehensive validation and optimistic updates
  const confirmRoleUpdate = useCallback(async (role: UserRole) => {
    if (!state.selectedUser) return;
    
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
    
    dispatch({ type: 'SET_UPDATING_USER_ID', payload: state.selectedUser.id });
    
    // Optimistic update with validation
    const previousUsers = [...state.users];
    const updatedUser = { ...state.selectedUser, role: normalizedRole as UserRole };
    dispatch({ type: 'SET_USERS', payload: state.users.map(u => u.id === state.selectedUser!.id ? updatedUser : u) });
    
    try {
      const success = await updateUserRole(state.selectedUser.id, normalizedRole as UserRole);
      
      if (!success) {
        // Rollback optimistic update
        dispatch({ type: 'SET_USERS', payload: previousUsers });
        throw new Error('Failed to update user role');
      }
      
      toast({
        title: "Role updated successfully",
        description: `User is now ${normalizedRole === 'admin' ? 'an admin' : normalizedRole === 'moderator' ? 'a moderator' : 'a user'}.`,
      });
    } catch (e: any) {
      // Rollback optimistic update
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
  }, [state.selectedUser, state.users, toast]);
  
  // Reset environment configuration with validation
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
  }, [toast]);

  const reinitializeConnection = useCallback(() => {
    dispatch({ type: 'SET_DIALOG', payload: null });
    window.location.href = window.location.pathname + "?force_init=true";
  }, []);

  // Setter functions for external use
  const setSelectedUser = useCallback((user: UserWithRole | null) => {
    dispatch({ type: 'SET_SELECTED_USER', payload: user });
  }, []);

  const setDialog = useCallback((dialog: "promote" | "demote" | "environment" | null) => {
    dispatch({ type: 'SET_DIALOG', payload: dialog });
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  }, []);

  const setPageSize = useCallback((size: number) => {
    dispatch({ type: 'SET_PAGE_SIZE', payload: size });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const setRoleFilter = useCallback((filter: string) => {
    dispatch({ type: 'SET_ROLE_FILTER', payload: filter });
  }, []);

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
