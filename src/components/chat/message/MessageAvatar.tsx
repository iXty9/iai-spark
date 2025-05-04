
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAppSettings } from '@/services/admin/settingsService';

interface MessageAvatarProps {
  isUser: boolean;
  onAiIconError?: () => void;
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ isUser, onAiIconError }) => {
  const { user, profile } = useAuth();
  const [aiAvatarUrl, setAiAvatarUrl] = useState<string>("https://ixty9.com/wp-content/uploads/2023/10/cropped-faviconV4.png");
  
  useEffect(() => {
    if (!isUser) {
      // Only fetch avatar URL for AI messages
      const getAvatarUrl = async () => {
        try {
          const settings = await fetchAppSettings();
          if (settings.avatar_url && settings.avatar_url.trim() !== '') {
            setAiAvatarUrl(settings.avatar_url);
          }
        } catch (error) {
          console.error('Error fetching AI avatar URL:', error);
        }
      };
      
      getAvatarUrl();
    }
  }, [isUser]);
  
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

  // Both user and AI avatars use the same size
  return (
    <Avatar className="w-6 h-6" title={displayName}>
      <AvatarImage
        src={isUser ? (profile?.avatar_url || "https://ixty9.com/wp-content/uploads/2025/04/profile-circle-icon-256x256-1.png") : aiAvatarUrl}
        alt={`${displayName}'s Avatar`}
      />
      <AvatarFallback className={isUser ? "bg-primary/10 text-primary text-xs" : "bg-[#ea384c] text-white text-xs"}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
