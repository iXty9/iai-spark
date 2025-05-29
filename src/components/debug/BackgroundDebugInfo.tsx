
import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { productionThemeService } from '@/services/production-theme-service';
import { backgroundStateManager } from '@/services/background-state-manager';

export const BackgroundDebugInfo: React.FC = () => {
  const { backgroundImage, backgroundOpacity, isThemeLoaded } = useTheme();
  const themeState = productionThemeService.getState();
  const backgroundState = backgroundStateManager.getState();
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 text-xs rounded z-50 max-w-xs">
      <div className="font-bold">Background Debug:</div>
      <div>Theme Loaded: {isThemeLoaded ? '✅' : '❌'}</div>
      <div>Service Ready: {themeState.isReady ? '✅' : '❌'}</div>
      <div>Client Ready: {backgroundState.isClientReady ? '✅' : '❌'}</div>
      <div>Background Loaded: {backgroundState.isLoaded ? '✅' : '❌'}</div>
      <div>Background Applied: {backgroundState.isApplied ? '✅' : '❌'}</div>
      <div>Has Image: {backgroundImage ? '✅' : '❌'}</div>
      <div>Manager Image: {backgroundState.image ? '✅' : '❌'}</div>
      <div>Opacity: {backgroundOpacity}</div>
      <div>Manager Opacity: {backgroundState.opacity}</div>
      {backgroundState.lastError && (
        <div className="text-red-300">Error: {backgroundState.lastError}</div>
      )}
    </div>
  );
};
