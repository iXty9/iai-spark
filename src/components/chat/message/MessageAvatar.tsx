
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { settingsCacheService } from '@/services/settings-cache-service';
import { avatarCacheService } from '@/services/avatar-cache-service';
import { logger } from '@/utils/logging';

interface MessageAvatarProps {
  isUser: boolean;
  onAiIconError?: () => void;
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ isUser, onAiIconError }) => {
  const { user, profile } = useAuth();
  const [aiAvatarUrl, setAiAvatarUrl] = useState<string | null>(null);
  const [defaultUserAvatar, setDefaultUserAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  
  useEffect(() => {
    let isMounted = true;
    
    const getAvatarSettings = async () => {
      try {
        const settings = await settingsCacheService.getSettings();
        if (isMounted) {
          const defaultAvatar = settings?.default_avatar_url || null;
          
          if (!isUser) {
            // For AI messages, use avatar_url or default to default_avatar_url
            const aiAvatar = settings?.avatar_url || defaultAvatar;
            setAiAvatarUrl(aiAvatar);
            
            // Preload the avatar if it exists
            if (aiAvatar) {
              avatarCacheService.preloadImage(aiAvatar);
            }
          } else {
            // For user messages, store the default for fallback
            setDefaultUserAvatar(defaultAvatar);
          }
          setAvatarError(false);
        }
      } catch (error) {
        logger.error('Error fetching avatar settings:', error);
        if (isMounted) {
          setAvatarError(true);
          if (!isUser && onAiIconError) onAiIconError();
        }
      }
    };
    
    getAvatarSettings();
    
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

  // Get the appropriate avatar URL
  const getAvatarUrl = (): string | undefined => {
    if (isUser) {
      return profile?.avatar_url || defaultUserAvatar || undefined;
    } else {
      return aiAvatarUrl || undefined;
    }
  };

  // Both user and AI avatars use the same size but theme-aware styling
  return (
    <Avatar className="w-6 h-6" title={displayName}>
      <AvatarImage
        src={getAvatarUrl()}
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
