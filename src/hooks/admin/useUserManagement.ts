import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logging';
import { withSupabase } from '@/services/supabase/connection-service';
import { resetSupabaseClient } from '@/services/supabase/connection-service';
import { clearAllEnvironmentConfigs } from '@/config/supabase-config';
import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in?: string;
  display_name?: string;
  avatar_url?: string;
}

export function useUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([
    'admin', 'moderator', 'user'
  ]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await withSupabase(async (client) => {
        let query = client
          .from('profiles')
          .select('id, email, role, created_at, last_sign_in, display_name, avatar_url', { count: 'exact' });
        
        // Apply search filter if provided
        if (searchQuery) {
          query = query.or(`email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
        }
        
        // Apply role filter if selected
        if (selectedRole) {
          query = query.eq('role', selectedRole);
        }
        
        // Apply sorting
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
        
        // Apply pagination
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
        
        const { data, error, count } = await query;
        
        if (error) throw error;
        
        return { data, count };
      });
      
      setUsers(result.data || []);
      setTotalCount(result.count || 0);
      
      logger.info('Users fetched successfully', { 
        module: 'user-management',
        count: result.count,
        page: currentPage,
        pageSize
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      logger.error('Error fetching users', err, { module: 'user-management' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, selectedRole, sortColumn, sortDirection]);

  const fetchRoles = useCallback(async () => {
    try {
      const result = await withSupabase(async (client) => {
        const { data, error } = await client
          .from('roles')
          .select('name')
          .order('name');
        
        if (error) throw error;
        return data;
      });
      
      if (result && result.length > 0) {
        setAvailableRoles(result.map(r => r.name));
      }
    } catch (err) {
      logger.error('Error fetching roles', err, { module: 'user-management' });
      // Fall back to default roles if fetch fails
    }
  }, []);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await withSupabase(async (client) => {
        const { error } = await client
          .from('profiles')
          .update({ role: newRole })
          .eq('id', userId);
        
        if (error) throw error;
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      toast.success(`User role updated to ${newRole}`);
      logger.info('User role updated', { module: 'user-management', userId, newRole });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user role';
      toast.error(errorMessage);
      logger.error('Error updating user role', err, { module: 'user-management', userId });
      return false;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await withSupabase(async (client) => {
        // First delete auth user
        const { error: authError } = await client.auth.admin.deleteUser(userId);
        if (authError) throw authError;
        
        // Then delete profile
        const { error: profileError } = await client
          .from('profiles')
          .delete()
          .eq('id', userId);
        
        if (profileError) throw profileError;
      });
      
      // Update local state
      setUsers(users.filter(user => user.id !== userId));
      
      toast.success('User deleted successfully');
      logger.info('User deleted', { module: 'user-management', userId });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      toast.error(errorMessage);
      logger.error('Error deleting user', err, { module: 'user-management', userId });
      return false;
    }
  };

  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    try {
      await withSupabase(async (client) => {
        const { error } = await client
          .from('profiles')
          .update(data)
          .eq('id', userId);
        
        if (error) throw error;
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...data } : user
      ));
      
      toast.success('User profile updated');
      logger.info('User profile updated', { module: 'user-management', userId });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user profile';
      toast.error(errorMessage);
      logger.error('Error updating user profile', err, { module: 'user-management', userId });
      return false;
    }
  };

  // Load users on initial render and when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Load roles on initial render
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Additional functions for the hook return value
  const fetchAndSetUsers = async (options = {}) => {
    setLoading(true);
    try {
      await fetchUsers();
      return users;
    } catch (error) {
      logger.error('Error in fetchAndSetUsers', error, { module: 'user-management' });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const confirmRoleUpdate = async (userId: string, role: string) => {
    try {
      const success = await updateUserRole(userId, role);
      return success;
    } catch (error) {
      logger.error('Error confirming role update', error, { module: 'user-management', userId, role });
      return false;
    }
  };

  const resetEnvironmentConfig = async () => {
    try {
      clearAllEnvironmentConfigs();
      toast.success('Environment configurations reset');
      logger.info('Environment configurations reset', { module: 'user-management' });
      return true;
    } catch (error) {
      logger.error('Error resetting environment config', error, { module: 'user-management' });
      toast.error('Failed to reset environment configurations');
      return false;
    }
  };

  const reinitializeConnection = async () => {
    try {
      resetSupabaseClient();
      toast.success('Connection reinitialized');
      logger.info('Connection reinitialized', { module: 'user-management' });
      return true;
    } catch (error) {
      logger.error('Error reinitializing connection', error, { module: 'user-management' });
      toast.error('Failed to reinitialize connection');
      return false;
    }
  };

  return {
    users,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
    selectedRole,
    setSelectedRole,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    selectedUser,
    setSelectedUser,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isRoleModalOpen,
    setIsRoleModalOpen,
    availableRoles,
    fetchUsers,
    updateUserRole,
    deleteUser,
    updateUserProfile,
    fetchAndSetUsers,
    confirmRoleUpdate,
    resetEnvironmentConfig,
    reinitializeConnection
  };
}
