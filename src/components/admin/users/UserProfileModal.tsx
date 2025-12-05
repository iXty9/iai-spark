import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, ExternalLink, Mail, Phone, User, Calendar, Clock, Shield } from 'lucide-react';
import { UserWithRole } from '@/services/admin/types/userTypes';
import { fetchUserProfile, AdminProfileData, formatUserDisplayName } from '@/services/admin/adminProfileService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UserProfileModalProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileModal({ user, open, onOpenChange }: UserProfileModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      fetchUserProfile(user.id)
        .then(setProfile)
        .finally(() => setLoading(false));
    } else {
      setProfile(null);
    }
  }, [open, user]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const handleEditProfile = () => {
    if (user) {
      onOpenChange(false);
      navigate(`/admin/user/${user.id}`);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'default';
      default: return 'secondary';
    }
  };

  const displayName = formatUserDisplayName(profile, user?.email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* Header with Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-lg">{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{displayName}</h3>
                {profile?.username && profile.username !== displayName && (
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                )}
                <Badge variant={getRoleBadgeVariant(user.role)} className="mt-1">
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role}
                </Badge>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{user.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(user.email, 'Email')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {profile?.phone_number && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      {profile.phone_country_code} {profile.phone_number}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(`${profile.phone_country_code}${profile.phone_number}`, 'Phone')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-mono truncate">{user.id}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(user.id, 'User ID')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs">Created</span>
                </div>
                <p className="font-medium">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">Last Login</span>
                </div>
                <p className="font-medium">
                  {user.last_sign_in_at
                    ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy')
                    : 'Never'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button className="flex-1" onClick={handleEditProfile}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
