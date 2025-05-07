
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  UserWithRole, UserRole, UsersFetchOptions, UsersSearchOptions, UsersFetchResult
} from '@/services/admin/types/userTypes';
import { fetchUsers, searchUsers, updateUserRole } from '@/services/admin/userService';
import { checkIsAdmin } from '@/services/admin/userRolesService';
import { checkAdminConnectionStatus } from '@/services/admin/roleService';
import { clearAllEnvironmentConfigs } from '@/config/supabase-config';

export function useUserManagement() {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialog, setDialog] = useState<"promote" | "demote" | "environment" | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Pagination + Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Universal fetcher
  const fetchAndSetUsers = useCallback(async (search = false) => {
    setLoading(true);
    setError(null);
    try {
      const fn = search ? searchUsers : fetchUsers;
      const { users: usersData, totalCount } = await fn({
        searchQuery,
        page: search ? 1 : currentPage,
        pageSize,
        roleFilter: roleFilter !== 'all' ? roleFilter as UserRole : undefined,
      });
      setUsers(usersData);
      setTotalPages(Math.ceil(totalCount / pageSize) || 1);
      if (search) setCurrentPage(1);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users.');
      toast({
        variant: "destructive",
        title: search ? "Search failed" : "Failed to load users",
        description: search
          ? "Error searching users. Please check your connection and try again."
          : "Error loading user data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, pageSize, roleFilter, toast]);

  // Check connection status on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await checkAdminConnectionStatus();
        setConnectionStatus(status);
        
        // If there are connection issues, show appropriate error
        if (!status.isConnected) {
          setError('Database connection error. Please check your Supabase configuration.');
        } else if (!status.isAuthenticated) {
          setError('Authentication error. Please sign in again.');
        } else if (!status.isAdmin) {
          setError('Access denied. You do not have admin privileges.');
        } else if (!status.functionAvailable) {
          setError('Admin functions not available. This may indicate a cross-environment configuration issue.');
        } else {
          // Only fetch users if connection status is good
          fetchAndSetUsers(false);
        }
      } catch (e) {
        console.error("Error checking connection status:", e);
        setError('Failed to check connection status. Please try again.');
        setLoading(false);
      }
    };
    
    checkConnection();
  }, [fetchAndSetUsers]);

  // Role update: promote or demote
  const confirmRoleUpdate = async (role: UserRole) => {
    if (!selectedUser) return;
    setUpdatingRole(true);
    try {
      await updateUserRole(selectedUser.id, role);
      setUsers(users =>
        users.map(u => u.id === selectedUser.id ? { ...u, role } : u));
      toast({
        title: "User role updated",
        description: `${selectedUser.email} is now a${role === 'admin' ? 'n' : ''} ${role}.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Failed to update user role",
        description: e?.message || "There was an error updating the user role.",
      });
    } finally {
      setUpdatingRole(false);
      setDialog(null);
      setSelectedUser(null);
    }
  };
  
  // Reset environment configuration
  const resetEnvironmentConfig = () => {
    clearAllEnvironmentConfigs();
    toast({
      title: "Configuration Reset",
      description: "All environment-specific configurations have been cleared. Please refresh the page.",
    });
    // Close dialog
    setDialog(null);
    // Force page reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const reinitializeConnection = useCallback(() => {
    setDialog(null);
    window.location.href = window.location.pathname + "?force_init=true";
  }, []);

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
