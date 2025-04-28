
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  UserWithRole,
  UserRole,
  fetchUsers,
  updateUserRole
} from '@/services/admin/userRolesService';
import { UsersTable } from './users/UsersTable';
import { PromoteDialog, DemoteDialog } from './users/RoleDialogs';

export function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showDemoteDialog, setShowDemoteDialog] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const usersData = await fetchUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        variant: "destructive",
        title: "Failed to load users",
        description: "There was an error loading user data.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromoteUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowPromoteDialog(true);
  };

  const handleDemoteUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowDemoteDialog(true);
  };

  const confirmRoleUpdate = async (role: UserRole) => {
    if (!selectedUser) return;
    
    setIsUpdatingRole(true);
    try {
      await updateUserRole(selectedUser.id, role);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id ? { ...user, role } : user
        )
      );
      
      toast({
        title: "User role updated",
        description: `${selectedUser.email} is now a${role === 'admin' ? 'n' : ''} ${role}.`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        variant: "destructive",
        title: "Failed to update user role",
        description: "There was an error updating the user role.",
      });
    } finally {
      setIsUpdatingRole(false);
      setShowPromoteDialog(false);
      setShowDemoteDialog(false);
      setSelectedUser(null);
    }
  };

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <>
      <UsersTable 
        users={users}
        onPromoteUser={handlePromoteUser}
        onDemoteUser={handleDemoteUser}
      />
      
      <PromoteDialog 
        user={selectedUser}
        isUpdating={isUpdatingRole}
        isOpen={showPromoteDialog}
        onOpenChange={setShowPromoteDialog}
        onConfirm={() => confirmRoleUpdate('admin')}
      />
      
      <DemoteDialog 
        user={selectedUser}
        isUpdating={isUpdatingRole}
        isOpen={showDemoteDialog}
        onOpenChange={setShowDemoteDialog}
        onConfirm={() => confirmRoleUpdate('user')}
      />
    </>
  );
}
