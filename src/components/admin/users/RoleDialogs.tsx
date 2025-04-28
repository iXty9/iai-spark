
import { UserWithRole } from '@/services/admin/userRolesService';
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

interface RoleDialogProps {
  user: UserWithRole | null;
  isUpdating: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function PromoteDialog({ user, isUpdating, isOpen, onOpenChange, onConfirm }: RoleDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to promote {user?.email} to admin? 
            They will have full access to all admin features.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isUpdating}
          >
            {isUpdating ? 'Promoting...' : 'Promote'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DemoteDialog({ user, isUpdating, isOpen, onOpenChange, onConfirm }: RoleDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Demote to User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to demote {user?.email} to regular user? 
            They will lose access to all admin features.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isUpdating}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isUpdating ? 'Demoting...' : 'Demote'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
