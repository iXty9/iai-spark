
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

interface UsersTableProps {
  users: UserWithRole[];
  onPromoteUser: (user: UserWithRole) => void;
  onDemoteUser: (user: UserWithRole) => void;
}

export function UsersTable({ users, onPromoteUser, onDemoteUser }: UsersTableProps) {
  return (
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
