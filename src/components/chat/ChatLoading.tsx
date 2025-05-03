
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatLoadingProps {
  animation?: string;
}

export const ChatLoading: React.FC<ChatLoadingProps> = ({ animation }) => {
  return (
    <div className="flex flex-col space-y-2 w-full max-w-[70%]">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton 
        className="h-16 w-full rounded-xl" 
        style={{ animation: animation ? `pulse ${animation}` : undefined }}
      />
    </div>
  );
};
