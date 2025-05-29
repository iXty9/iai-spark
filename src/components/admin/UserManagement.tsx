
import { Skeleton } from '@/components/ui/skeleton';
import { UserManagementHeader } from './users/UserManagementHeader';
import { UsersTable } from './users/UsersTable';
import { UserManagementPagination } from './users/UserManagementPagination';
import { ConnectionStatusPanel } from './users/ConnectionStatusPanel';
import { EnvironmentSettingsDialog } from './users/EnvironmentSettingsDialog';
import { PromoteDialog, DemoteDialog } from './users/RoleDialogs';
import { UserManagementErrorBoundary } from './users/UserManagementErrorBoundary';
import { Loader } from 'lucide-react';
import { useUserManagement } from '@/hooks/admin/useUserManagement';

function UserManagementContent() {
  const {
    users,
    loading,
    error,
    connectionStatus,
    selectedUser,
    setSelectedUser,
    dialog,
    setDialog,
    updatingUserId,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    clearFilters,
    fetchAndSetUsers,
    confirmRoleUpdate,
    resetEnvironmentConfig,
    reinitializeConnection,
    validationErrors
  } = useUserManagement();

  // Initial loading state with enhanced skeleton
  if (loading && users.length === 0) return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[110px]" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      
      <div className="rounded-md border bg-card">
        <div className="p-8 flex flex-col items-center justify-center">
          <Loader className="h-8 w-8 animate-spin mb-4 text-primary" />
          <h3 className="text-lg font-medium mb-2">Loading users</h3>
          <p className="text-muted-foreground">Please wait while we fetch the user data...</p>
        </div>
      </div>
    </div>
  );

  // Error state
  if (error) {
    return (
      <div className="animate-fade-in">
        <ConnectionStatusPanel
          error={error}
          connectionStatus={connectionStatus}
          onRetry={() => fetchAndSetUsers(false)}
          onOpenEnvironmentSettings={() => setDialog('environment')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Display validation errors if any */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
          <h4 className="font-medium text-destructive mb-2">Validation Errors:</h4>
          <ul className="list-disc list-inside text-sm text-destructive">
            {Object.entries(validationErrors).map(([field, message]) => (
              <li key={field}>{field}: {message}</li>
            ))}
          </ul>
        </div>
      )}

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
        connectionInfo={connectionStatus?.environmentInfo}
        onOpenEnvironmentSettings={() => setDialog('environment')}
      />

      {/* Users Table with enhanced UX */}
      <div className="transition-all duration-200">
        <UsersTable
          users={users}
          onPromoteUser={u => { setSelectedUser(u); setDialog("promote"); }}
          onDemoteUser={u => { setSelectedUser(u); setDialog("demote"); }}
          isLoading={loading}
          searchQuery={searchQuery}
          roleFilter={roleFilter}
          onClearFilters={clearFilters}
          updatingUserId={updatingUserId}
        />
      </div>

      {/* Pagination with improved design */}
      {!loading && users.length > 0 && (
        <div className="animate-fade-in">
          <UserManagementPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Enhanced Dialogs */}
      <PromoteDialog
        user={dialog === "promote" ? selectedUser : null}
        isUpdating={!!updatingUserId}
        isOpen={dialog === "promote"}
        onOpenChange={v => !v && setDialog(null)}
        onConfirm={() => confirmRoleUpdate('admin')}
      />
      
      <DemoteDialog
        user={dialog === "demote" ? selectedUser : null}
        isUpdating={!!updatingUserId}
        isOpen={dialog === "demote"}
        onOpenChange={v => !v && setDialog(null)}
        onConfirm={() => confirmRoleUpdate('user')}
      />
      
      <EnvironmentSettingsDialog
        isOpen={dialog === "environment"}
        onClose={() => setDialog(null)}
        connectionStatus={connectionStatus}
        onResetConfig={resetEnvironmentConfig}
        onReinitialize={reinitializeConnection}
      />
    </div>
  );
}

export function UserManagement() {
  return (
    <UserManagementErrorBoundary>
      <UserManagementContent />
    </UserManagementErrorBoundary>
  );
}
