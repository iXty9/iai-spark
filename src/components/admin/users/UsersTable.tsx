import { UserWithRole } from '@/services/admin/types/userTypes';
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { User, Crown, Shield, Copy } from 'lucide-react';
import { LoadingSkeletonTable } from './LoadingSkeletonTable';
import { EmptyStateTable } from './EmptyStateTable';
import { UserRowActions } from './UserRowActions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface UsersTableProps {
  users: UserWithRole[];
  onPromoteUser: (user: UserWithRole) => void;
  onDemoteUser: (user: UserWithRole) => void;
  isLoading?: boolean;
  searchQuery?: string;
  roleFilter?: string;
  onClearFilters?: () => void;
  updatingUserId?: string;
}

export function UsersTable({ 
  users, 
  onPromoteUser, 
  onDemoteUser, 
  isLoading = false,
  searchQuery = '',
  roleFilter = 'all',
  onClearFilters = () => {},
  updatingUserId
}: UsersTableProps) {
  const { toast } = useToast();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      console.error('Invalid date:', dateString, error);
      return 'Invalid date';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3" />;
      case 'moderator':
        return <Shield className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'moderator':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Failed to copy to clipboard",
      });
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableCaption className="text-xs text-muted-foreground py-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
              Loading users...
            </div>
          ) : (
            `${users.length} user${users.length !== 1 ? 's' : ''} found`
          )}
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">User ID</TableHead>
            <TableHead className="font-semibold">Username</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Created</TableHead>
            <TableHead className="font-semibold">Last Login</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingSkeletonTable rows={5} />
          ) : users.length === 0 ? (
            <EmptyStateTable 
              searchQuery={searchQuery}
              roleFilter={roleFilter}
              onClearFilters={onClearFilters}
            />
          ) : (
            users.map(user => (
              <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        {user.id}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-muted"
                              onClick={() => copyToClipboard(user.id, 'User ID')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy user ID</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {user.username || 'No username'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border ${getRoleColor(user.role)}`}>
                    {getRoleIcon(user.role)}
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(user.last_sign_in_at)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <UserRowActions
                    user={user}
                    onPromoteUser={onPromoteUser}
                    onDemoteUser={onDemoteUser}
                    isUpdating={updatingUserId === user.id}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
