import { useState, useEffect } from 'react';
import { 
  fetchUsers, 
  deleteUser, 
  updateUserStatus 
} from '@/services/admin/userService';
import { UsersFetchOptions } from '@/services/admin/types/userTypes';
import { updateUserRole } from '@/services/admin/userRolesService';
import { StatusType } from '@/services/admin/types/statusTypes';

export function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const fetchUserList = async (options: UsersFetchOptions = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUsers(options);
      setUsers(result.users);
      setPagination(result.metadata);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const removeUser = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const success = await deleteUser(userId);
      if (success) {
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
        setPagination(prevPagination => ({
          ...prevPagination,
          totalCount: prevPagination.totalCount - 1,
        }));
      } else {
        setError(new Error('Failed to delete user'));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const changeUserStatus = async (userId: string, status: StatusType, reason?: string) => {
    setLoading(true);
    setError(null);
    try {
      const success = await updateUserStatus(userId, status, reason);
      if (success) {
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId ? { ...user, status } : user
          )
        );
      } else {
        setError(new Error('Failed to update user status'));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const changeUserRole = async (userId: string, role: string) => {
    setLoading(true);
    setError(null);
    try {
      const success = await updateUserRole(userId, role);
      if (success) {
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId ? { ...user, role } : user
          )
        );
      } else {
        setError(new Error('Failed to update user role'));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    error,
    pagination,
    fetchUserList,
    removeUser,
    changeUserStatus,
    changeUserRole,
  };
}
