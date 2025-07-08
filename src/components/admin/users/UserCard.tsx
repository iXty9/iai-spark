import React from 'react';
import { UserWithRole } from '@/services/admin/types/userTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Crown, Shield, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { supaToast } from '@/services/supa-toast';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { UserRowActions } from './UserRowActions';
import { cn } from '@/lib/utils';

interface UserCardProps {
  user: UserWithRole;
  onPromoteUser: (user: UserWithRole) => void;
  onDemoteUser: (user: UserWithRole) => void;
  updatingUserId?: string;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export function UserCard({ 
  user, 
  onPromoteUser, 
  onDemoteUser, 
  updatingUserId,
  isExpanded = false,
  onToggleExpanded 
}: UserCardProps) {
  // Using unified SupaToast system

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
      supaToast.success(`${label} copied to clipboard`, {
        title: "Copied!"
      });
    } catch (error) {
      supaToast.error("Failed to copy to clipboard", {
        title: "Copy failed"
      });
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="space-y-3">
          {/* Header with avatar and role */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {user.username || 'No username'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(user.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border ${getRoleColor(user.role)}`}>
                {getRoleIcon(user.role)}
                <span className="hidden sm:inline">{user.role}</span>
              </Badge>
              <UserRowActions
                user={user}
                onPromoteUser={onPromoteUser}
                onDemoteUser={onDemoteUser}
                isUpdating={updatingUserId === user.id}
              />
            </div>
          </div>

          {/* Collapsible details */}
          {onToggleExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              className="w-full justify-between h-8 text-xs text-muted-foreground hover:bg-muted/50"
            >
              <span>{isExpanded ? 'Hide' : 'Show'} Details</span>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}

          {/* Expanded details */}
          <div className={cn(
            "space-y-2 transition-all duration-200 overflow-hidden",
            isExpanded ? "block" : "hidden"
          )}>
            <div className="bg-muted/30 rounded-md p-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">User ID:</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-background px-1 py-0.5 rounded font-mono border">
                    {user.id.slice(0, 8)}...
                  </code>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-muted"
                          onClick={() => copyToClipboard(user.id, 'User ID')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy full user ID</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last Login:</span>
                <span className="text-right">{formatDate(user.last_sign_in_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}