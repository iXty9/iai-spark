import { useState, useEffect, useCallback } from 'react';
import { UserWithRole, UsersFetchOptions } from '@/services/admin/types/userTypes';
import { fetchUsers } from '@/services/admin/userService';
import { checkAdminConnectionStatus } from '@/services/admin/roleService';
import { updateUserRole } from '@/services/admin/userRolesService';
import { AdminConnectionStatus } from '@/services/admin/types/statusTypes';
import { logger } from '@/utils/logging';

export function useUserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<AdminConnectionStatus | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialog, setDialog] = useState<"promote" | "demote" | "environment" | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);

  const fetchAndSetUsers = useCallback(async (resetPage: boolean = false) => {
    setLoading(true);
    try {
      if (resetPage) {
        setCurrentPage(1); // Reset to the first page when search query changes
      }

      const options: UsersFetchOptions = {
        page: currentPage,
        pageSize: pageSize,
        roleFilter: roleFilter as any,
        searchQuery: searchQuery,
      };

      const result = await fetchUsers(options);
      setUsers(result.users);
      setTotalPages(Math.ceil(result.totalCount / pageSize));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch users.');
      logger.error('Failed to fetch users', e);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, roleFilter, searchQuery]);

  const fetchConnectionStatus = useCallback(async () => {
    try {
      const status = await checkAdminConnectionStatus();
      setConnectionStatus(status);
    } catch (e: any) {
      setError(e.message || 'Failed to check connection status.');
      logger.error('Failed to check connection status', e);
    }
  }, []);

  useEffect(() => {
    fetchAndSetUsers();
    fetchConnectionStatus();
  }, [fetchAndSetUsers, fetchConnectionStatus]);

  const confirmRoleUpdate = async (newRole: string) => {
    if (!selectedUser) return;

    setUpdatingRole(true);
    try {
      await updateUserRole(selectedUser.id, newRole);
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === selectedUser.id ? { ...user, role: newRole as any } : user
        )
      );
      setDialog(null);
      setError(null);
      fetchAndSetUsers(); // Refresh the user list
    } catch (e: any) {
      setError(e.message || 'Failed to update user role.');
      logger.error('Failed to update user role', e);
    } finally {
      setUpdatingRole(false);
    }
  };

  const resetEnvironmentConfig = async () => {
    setLoading(true);
    try {
      // Placeholder for reset function
      // await resetEnvironment();
      fetchConnectionStatus();
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to reset environment.');
      logger.error('Failed to reset environment', e);
    } finally {
      setLoading(false);
    }
  };

  const reinitializeConnection = async () => {
    setLoading(true);
    try {
      // Placeholder for reinitialize function
      // await reinitialize();
      fetchConnectionStatus();
      fetchAndSetUsers();
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to reinitialize connection.');
      logger.error('Failed to reinitialize connection', e);
    } finally {
      setLoading(false);
    }
  };

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
