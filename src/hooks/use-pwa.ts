import { useState, useEffect } from 'react';
import { logger } from '@/utils/logging';

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAHook {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  promptInstall: () => Promise<boolean>;
  needsUpdate: boolean;
  updateApp: () => Promise<void>;
}

export const usePWA = (): PWAHook => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as any);
      setIsInstallable(true);
      logger.info('PWA install prompt available', { module: 'pwa' });
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      logger.info('PWA installed successfully', { module: 'pwa' });
    };

    // Listen for online/offline changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          setRegistration(reg);
          logger.info('Service Worker registered successfully', { module: 'pwa' });

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setNeedsUpdate(true);
                  logger.info('New service worker available', { module: 'pwa' });
                }
              });
            }
          });
        })
        .catch((error) => {
          logger.error('Service Worker registration failed:', error, { module: 'pwa' });
        });
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      logger.warn('No install prompt available', { module: 'pwa' });
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      setIsInstallable(false);
      
      logger.info('Install prompt result:', { outcome, module: 'pwa' });
      return outcome === 'accepted';
    } catch (error) {
      logger.error('Error showing install prompt:', error, { module: 'pwa' });
      return false;
    }
  };

  const updateApp = async (): Promise<void> => {
    if (!registration || !registration.waiting) {
      return;
    }

    try {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setNeedsUpdate(false);
      
      // Reload the page to get the new version
      window.location.reload();
      
      logger.info('App updated successfully', { module: 'pwa' });
    } catch (error) {
      logger.error('Error updating app:', error, { module: 'pwa' });
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOnline,
    promptInstall,
    needsUpdate,
    updateApp,
  };
};