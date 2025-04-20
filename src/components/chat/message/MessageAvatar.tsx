
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface MessageAvatarProps {
  isUser: boolean;
  onAiIconError?: () => void;
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({ isUser, onAiIconError }) => {
  if (isUser) {
    return (
      <Avatar className="w-6 h-6">
        <AvatarImage
          src="https://ixty9.com/wp-content/uploads/2025/04/profile-circle-icon-256x256-1.png"
          alt="User Avatar"
        />
        <AvatarFallback className="bg-primary/10 text-primary">
          <User className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className="w-6 h-6">
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
