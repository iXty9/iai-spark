
import { UserWithRole } from '@/services/admin/userRolesService';
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';

interface UsersTableProps {
  users: UserWithRole[];
  onPromoteUser: (user: UserWithRole) => void;
  onDemoteUser: (user: UserWithRole) => void;
  isLoading?: boolean;
}

export function UsersTable({ users, onPromoteUser, onDemoteUser, isLoading = false }: UsersTableProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption>List of all users in the system</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24">
                Loading users...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map(user => (
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
                <TableCell>{formatDate(user.created_at)}</TableCell>
                <TableCell>{user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}</TableCell>
                <TableCell className="text-right">
                  {user.role === 'admin' ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onDemoteUser(user)}
                    >
                      Demote to User
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="default" 
                      onClick={() => onPromoteUser(user)}
                    >
                      Promote to Admin
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
