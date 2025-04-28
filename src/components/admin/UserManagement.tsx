
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  UserWithRole,
  UserRole,
  fetchUsers,
  updateUserRole
} from '@/services/admin/userRolesService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
      <div className="rounded-md border">
        <Table>
          <TableCaption>List of all users in the system</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.username || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`inline-block px-2 py-1 text-xs rounded ${
                    user.role === 'admin' 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-secondary/40 text-secondary-foreground'
                  }`}>
                    {user.role}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {user.role === 'admin' ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDemoteUser(user)}
                    >
                      Demote to User
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="default" 
                      onClick={() => handlePromoteUser(user)}
                    >
                      Promote to Admin
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Promote Dialog */}
      <AlertDialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to promote {selectedUser?.email} to admin? 
              They will have full access to all admin features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmRoleUpdate('admin')}
              disabled={isUpdatingRole}
            >
              {isUpdatingRole ? 'Promoting...' : 'Promote'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demote Dialog */}
      <AlertDialog open={showDemoteDialog} onOpenChange={setShowDemoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote to User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to demote {selectedUser?.email} to regular user? 
              They will lose access to all admin features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmRoleUpdate('user')}
              disabled={isUpdatingRole}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isUpdatingRole ? 'Demoting...' : 'Demote'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
