
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { UserManagementHeader } from './users/UserManagementHeader';
import { UsersTable } from './users/UsersTable';
import { UserManagementPagination } from './users/UserManagementPagination';
import { ConnectionStatusPanel } from './users/ConnectionStatusPanel';
import { EnvironmentSettingsDialog } from './users/EnvironmentSettingsDialog';
import { PromoteDialog, DemoteDialog } from './users/RoleDialogs';
import { Loader } from 'lucide-react';
import { useUserManagement } from '@/hooks/admin/useUserManagement';

export function UserManagement() {
  const {
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
  } = useUserManagement();

  if (loading && users.length === 0) return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs"><Skeleton className="h-10 w-full" /></div>
          <Skeleton className="h-10 w-16" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[110px]" />
        </div>
      </div>
      <div className="rounded-md border">
        <div className="p-6 flex flex-col items-center justify-center">
          <Loader className="h-6 w-6 animate-spin mb-2" />
          <p>Loading users...</p>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <ConnectionStatusPanel
        error={error.message}
        connectionStatus={connectionStatus}
        onRetry={() => fetchAndSetUsers(false)}
        onOpenEnvironmentSettings={() => setDialog({ type: "environment", isOpen: true, data: null })}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <UserManagementHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        pageSize={pageSize}
        setPageSize={setPageSize}
        onSearch={() => fetchAndSetUsers(true)}
        onRefresh={() => fetchAndSetUsers(false)}
        loading={loading}
        connectionInfo={connectionStatus ? connectionStatus : { environmentId: 'unknown' }}
        onOpenEnvironmentSettings={() => setDialog({ type: "environment", isOpen: true, data: null })}
      />

      {/* Users Table */}
      <UsersTable
        users={users}
        onPromoteUser={u => { setSelectedUser(u); setDialog({ type: "promote", isOpen: true, data: null }); }}
        onDemoteUser={u => { setSelectedUser(u); setDialog({ type: "demote", isOpen: true, data: null }); }}
        isLoading={loading}
      />

      {/* Pagination */}
      <UserManagementPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Dialogs */}
      <PromoteDialog
        user={dialog.type === "promote" ? selectedUser : null}
        isUpdating={updatingRole}
        isOpen={dialog.type === "promote"}
        onOpenChange={v => !v && setDialog({ type: "", isOpen: false, data: null })}
        onConfirm={() => confirmRoleUpdate('admin')}
      />
      
      <DemoteDialog
        user={dialog.type === "demote" ? selectedUser : null}
        isUpdating={updatingRole}
        isOpen={dialog.type === "demote"}
        onOpenChange={v => !v && setDialog({ type: "", isOpen: false, data: null })}
        onConfirm={() => confirmRoleUpdate('user')}
      />
      
      {/* Environment settings dialog */}
      <EnvironmentSettingsDialog
        isOpen={dialog.type === "environment"}
        onClose={() => setDialog({ type: "", isOpen: false, data: null })}
        connectionStatus={connectionStatus}
        onResetConfig={resetEnvironmentConfig}
        onReinitialize={reinitializeConnection}
      />
    </div>
  );
}
