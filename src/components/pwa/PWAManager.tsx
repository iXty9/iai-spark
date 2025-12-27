import React, { useState, useEffect } from 'react';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { CacheUpdateNotification } from './CacheUpdateNotification';
import { usePWA } from '@/hooks/use-pwa';
import { useAuth } from '@/contexts/AuthContext';

export const PWAManager: React.FC = () => {
  const { user } = useAuth();
  const { isInstallable, needsUpdate } = usePWA();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [bottomOffset, setBottomOffset] = useState<number>(16);

  // Show install prompt after a delay if app is installable
  useEffect(() => {
    if (isInstallable && !needsUpdate) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 10000); // Show after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstallable, needsUpdate]);

  // Show update notification when update is available (for all users, including anonymous)
  useEffect(() => {
    if (needsUpdate) {
      setShowUpdateNotification(true);
      // Hide install prompt if update is available
      setShowInstallPrompt(false);
    }
  }, [needsUpdate]);

  // Keep the install prompt above the chat input bar
  useEffect(() => {
    const updateOffset = () => {
      let offset = 16; // default spacing
      const el = document.getElementById('message-input-container');
      if (el) {
        const height = el.getBoundingClientRect().height || el.clientHeight || 0;
        offset = Math.max(16, Math.round(height + 16));
      }
      setBottomOffset(offset);
    };

    updateOffset();

    const el = document.getElementById('message-input-container');
    let ro: ResizeObserver | null = null;
    if (el && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => updateOffset());
      ro.observe(el);
    }

    window.addEventListener('resize', updateOffset);

    return () => {
      window.removeEventListener('resize', updateOffset);
      ro?.disconnect();
    };
  }, [showInstallPrompt, showUpdateNotification, isInstallable]);

  return (
    <>
      {/* Update notification takes priority over install prompt - for all users */}
      {showUpdateNotification && needsUpdate && (
        <div className="fixed left-4 right-4 z-[120] md:left-auto md:w-96" style={{ bottom: bottomOffset }}>
          <CacheUpdateNotification 
            onDismiss={() => setShowUpdateNotification(false)}
            onUpdate={() => setShowUpdateNotification(false)}
          />
        </div>
      )}
      
      {/* Install prompt shows only when no update is available */}
      {showInstallPrompt && isInstallable && !needsUpdate && (
        <div className="fixed left-4 right-4 z-[120] md:left-auto md:w-96" style={{ bottom: bottomOffset }}>
          <PWAInstallPrompt onDismiss={() => setShowInstallPrompt(false)} />
        </div>
      )}
    </>
  );
};