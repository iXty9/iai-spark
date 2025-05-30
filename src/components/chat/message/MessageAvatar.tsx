
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

interface MessageAvatarProps {
  isUser: boolean;
  onAiIconError?: () => void;
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ isUser, onAiIconError }) => {
  const { user, profile } = useAuth();
  const [aiAvatarUrl, setAiAvatarUrl] = useState<string>("https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png");
  const [avatarError, setAvatarError] = useState<boolean>(false);
  
  useEffect(() => {
    let isMounted = true;
    
    if (!isUser) {
      // Only fetch avatar URL for AI messages
      const getAvatarUrl = async () => {
        try {
          const settings = await fetchAppSettings();
          if (isMounted && settings?.avatar_url && settings.avatar_url.trim() !== '') {
            setAiAvatarUrl(settings.avatar_url);
            setAvatarError(false);
          }
        } catch (error) {
          logger.error('Error fetching AI avatar URL:', error);
          if (isMounted) {
            setAvatarError(true);
            if (onAiIconError) onAiIconError();
          }
        }
      };
      
      getAvatarUrl();
    }
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [isUser, onAiIconError]);
  
  // Get display name for the avatar
  const getDisplayName = (): string => {
    if (!isUser) return 'AI';
    if (!user) return 'User';
    
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.username) return profile.username;
    return 'User';
  };

  const displayName = getDisplayName();
  const initials = displayName === 'AI' ? 'AI' : displayName.charAt(0).toUpperCase();

  // Both user and AI avatars use the same size but theme-aware styling
  return (
    <Avatar className="w-6 h-6" title={displayName}>
      <AvatarImage
        src={isUser ? (profile?.avatar_url || "https://ixty9.com/wp-content/uploads/2025/04/profile-circle-icon-256x256-1.png") : aiAvatarUrl}
        alt={`${displayName}'s Avatar`}
        onError={() => {
          if (!isUser && !avatarError) {
            setAvatarError(true);
            if (onAiIconError) onAiIconError();
          }
        }}
      />
      <AvatarFallback className={isUser ? "bg-primary/10 text-primary text-xs" : "bg-primary text-primary-foreground text-xs"}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
