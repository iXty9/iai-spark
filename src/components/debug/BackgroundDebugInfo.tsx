
import React from 'react';
import { useTheme } from '@/contexts/SupaThemeContext';

export const BackgroundDebugInfo: React.FC = () => {
  const { backgroundImage, backgroundOpacity, isLoading } = useTheme();
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 text-xs rounded z-50 max-w-xs">
      <div className="font-bold">Background Debug:</div>
      <div>Theme Loading: {isLoading ? '⏳' : '✅'}</div>
      <div>Has Image: {backgroundImage ? '✅' : '❌'}</div>
      <div>Opacity: {backgroundOpacity}</div>
    </div>
  );
};
