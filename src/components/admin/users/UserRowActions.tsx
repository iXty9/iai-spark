
import { Button } from "@/components/ui/button";
import { UserWithRole } from '@/services/admin/types/userTypes';
import { Crown, User, Shield, Loader } from 'lucide-react';
import { useState } from 'react';

interface UserRowActionsProps {
  user: UserWithRole;
  onPromoteUser: (user: UserWithRole) => void;
  onDemoteUser: (user: UserWithRole) => void;
  isUpdating?: boolean;
}

export function UserRowActions({ user, onPromoteUser, onDemoteUser, isUpdating }: UserRowActionsProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (user.role === 'admin') {
    return (
      <Button 
        size="sm" 
        variant="outline" 
        onClick={() => onDemoteUser(user)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isUpdating}
        className="hover:bg-destructive hover:text-destructive-foreground transition-colors"
      >
        {isUpdating ? (
          <Loader className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <User className="h-3 w-3 mr-1" />
        )}
        {isHovered ? 'Demote to User' : 'Admin'}
      </Button>
    );
  }

  if (user.role === 'moderator') {
    return (
      <div className="flex gap-1">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => onPromoteUser(user)}
          disabled={isUpdating}
          className="hover:bg-primary hover:text-primary-foreground"
        >
          {isUpdating ? (
            <Loader className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Crown className="h-3 w-3 mr-1" />
          )}
          Promote
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => onDemoteUser(user)}
          disabled={isUpdating}
          className="hover:bg-destructive hover:text-destructive-foreground"
        >
          <User className="h-3 w-3 mr-1" />
          Demote
        </Button>
      </div>
    );
  }

  // user.role === 'user'
  return (
    <Button 
      size="sm" 
      variant="default" 
      onClick={() => onPromoteUser(user)}
      disabled={isUpdating}
      className="hover:bg-primary/90 transition-colors"
    >
      {isUpdating ? (
        <Loader className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <Shield className="h-3 w-3 mr-1" />
      )}
      Promote to Moderator
    </Button>
  );
}
