
import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { unifiedThemeController } from '@/services/unified-theme-controller';

export const BackgroundDebugInfo: React.FC = () => {
  const { backgroundImage, backgroundOpacity, isThemeLoaded } = useTheme();
  const controllerState = unifiedThemeController.getState();
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 text-xs rounded z-50 max-w-xs">
      <div className="font-bold">Background Debug:</div>
      <div>Theme Loaded: {isThemeLoaded ? '✅' : '❌'}</div>
      <div>Controller Init: {unifiedThemeController.initialized ? '✅' : '❌'}</div>
      <div>Has Image: {backgroundImage ? '✅' : '❌'}</div>
      <div>Image URL: {backgroundImage ? backgroundImage.substring(0, 30) + '...' : 'None'}</div>
      <div>Opacity: {backgroundOpacity}</div>
      <div>Controller Image: {controllerState.backgroundImage ? '✅' : '❌'}</div>
      <div>Controller Opacity: {controllerState.backgroundOpacity}</div>
    </div>
  );
};
