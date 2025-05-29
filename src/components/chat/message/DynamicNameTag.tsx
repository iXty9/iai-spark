
import React, { useRef } from 'react';
import { useDynamicContrast } from '@/hooks/use-dynamic-contrast';
import { cn } from '@/lib/utils';

interface DynamicNameTagProps {
  displayName: string;
  isUser: boolean;
  className?: string;
}

export const DynamicNameTag: React.FC<DynamicNameTagProps> = ({
  displayName,
  isUser,
  className
}) => {
  const nameTagRef = useRef<HTMLDivElement>(null);
  
  const { textColor, isHighContrast } = useDynamicContrast(nameTagRef, {
    enabled: true,
    fallbackColor: isUser ? '#000000' : '#000000',
    isLargeText: false // Name tags are small text
  });

  return (
    <div
      ref={nameTagRef}
      className={cn(
        'text-xs mb-1 font-medium transition-colors duration-300 ease-in-out',
        isUser ? 'text-right' : 'text-left',
        className
      )}
      style={{
        color: textColor,
        textShadow: isHighContrast ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
      }}
    >
      {displayName}
    </div>
  );
};
