
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MessageAvatarProps {
  isUser: boolean;
  onAiIconError?: () => void;
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ isUser, onAiIconError }) => {
  const { user, profile } = useAuth();
  
  // Get display name for the avatar
  const getDisplayName = (): string => {
    if (!isUser) return 'AI';
    if (!user) return 'User';
    
    if (profile?.full_name) return profile.full_name;
    if (profile?.username) return profile.username;
    return 'User';
  };

  const displayName = getDisplayName();
  const initials = displayName === 'AI' ? 'AI' : displayName.charAt(0).toUpperCase();

  if (isUser) {
    return (
      <Avatar className="w-6 h-6" title={displayName}>
        <AvatarImage
          src="https://ixty9.com/wp-content/uploads/2025/04/profile-circle-icon-256x256-1.png"
          alt={`${displayName}'s Avatar`}
        />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className="w-6 h-6" title="Ixty AI">
      <AvatarImage 
        src="https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png"
        alt="Ixty AI Avatar"
        onError={onAiIconError}
      />
      <AvatarFallback className="bg-[#ea384c] text-white flex items-center justify-center rounded-full text-xs">
        AI
      </AvatarFallback>
    </Avatar>
  );
};
