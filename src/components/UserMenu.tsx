
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, UserRound, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { checkIsAdmin } from '@/services/admin/userRolesService';
import { logger } from '@/utils/logging';

export const UserMenu = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchAdminStatus = async () => {
        setAdminCheckLoading(true);
        try {
          const adminStatus = await checkIsAdmin(user.id);
          setIsAdmin(adminStatus);
          logger.debug('Admin status checked', { 
            userId: user.id, 
            isAdmin: adminStatus,
            module: 'user-menu' 
          });
        } catch (error) {
          logger.error('Failed to check admin status', error, { 
            userId: user.id,
            module: 'user-menu' 
          });
          setIsAdmin(false);
        } finally {
          setAdminCheckLoading(false);
        }
      };
      fetchAdminStatus();
    } else {
      setIsAdmin(false);
      setAdminCheckLoading(false);
    }
  }, [user]);

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handleAdminClick = () => {
    navigate('/admin');
  };

  const handleLoginClick = () => {
    navigate('/auth');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: "There was an error signing out. Please try again.",
      });
    }
  };

  const getInitials = () => {
    if (profile?.username) {
      return profile.username.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'G';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative rounded-full h-9 w-9 md:h-8 md:w-8 border border-border/40 hover:border-[#dd3333]/30 transition-all duration-200 flex-shrink-0 shadow-sm"
        >
          <Avatar className="h-7 w-7 md:h-6 md:w-6">
            {user && profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile?.username || "User"} />
            ) : (
              <AvatarFallback className={user ? "bg-primary/10 text-primary text-xs" : "bg-secondary/80 text-xs"}>
                {user ? getInitials() : <UserRound className="h-3 w-3" />}
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-background/95 backdrop-blur-md border border-border/30 shadow-lg"
      >
        {user ? (
          <>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1 py-1">
                <p className="text-sm font-medium leading-none">{profile?.username || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfileClick} className="py-2">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            {user && (
              <DropdownMenuItem onClick={handleSettingsClick} className="py-2">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            )}
            {/* Show admin panel if user is admin and not currently loading */}
            {!adminCheckLoading && isAdmin && (
              <DropdownMenuItem onClick={handleAdminClick} className="py-2">
                <Shield className="mr-2 h-4 w-4" />
                <span>Admin Panel</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="py-2">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={handleLoginClick} className="py-2">
              <User className="mr-2 h-4 w-4" />
              <span>Log in</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
