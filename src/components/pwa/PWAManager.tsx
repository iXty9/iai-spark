import React, { useState, useEffect } from 'react';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { PWAUpdatePrompt } from './PWAUpdatePrompt';
import { usePWA } from '@/hooks/use-pwa';

export const PWAManager: React.FC = () => {
  const { isInstallable, needsUpdate } = usePWA();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  // Show install prompt after a delay if app is installable
  useEffect(() => {
    if (isInstallable) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 10000); // Show after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  // Show update prompt when update is available
  useEffect(() => {
    if (needsUpdate) {
      setShowUpdatePrompt(true);
    }
  }, [needsUpdate]);

  return (
    <>
      {showInstallPrompt && isInstallable && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:w-96">
          <PWAInstallPrompt onDismiss={() => setShowInstallPrompt(false)} />
        </div>
      )}
      
      {showUpdatePrompt && needsUpdate && (
        <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:w-96">
          <PWAUpdatePrompt onDismiss={() => setShowUpdatePrompt(false)} />
        </div>
      )}
    </>
  );
};