
import { useState, useMemo } from 'react';
import { UserWithRole } from '@/services/admin/types/userTypes';

export function useUserManagementState() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialog, setDialog] = useState<"promote" | "demote" | "environment" | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Pagination + Filter with validation
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Form validation states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Memoized values for performance
  const memoizedValues = useMemo(() => ({
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
    validationErrors
  }), [
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
    validationErrors
  ]);

  return {
    ...memoizedValues,
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
  };
}
