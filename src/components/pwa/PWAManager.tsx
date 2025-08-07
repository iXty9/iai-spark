import React, { useState, useEffect } from 'react';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { usePWA } from '@/hooks/use-pwa';

export const PWAManager: React.FC = () => {
  const { isInstallable } = usePWA();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [bottomOffset, setBottomOffset] = useState<number>(16);

  // Show install prompt after a delay if app is installable
  useEffect(() => {
    if (isInstallable) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 10000); // Show after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

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
  }, [showInstallPrompt, isInstallable]);

  return (
    <>
      {showInstallPrompt && isInstallable && (
        <div className="fixed left-4 right-4 z-[120] md:left-auto md:w-96" style={{ bottom: bottomOffset }}>
          <PWAInstallPrompt onDismiss={() => setShowInstallPrompt(false)} />
        </div>
      )}
    </>
  );
};