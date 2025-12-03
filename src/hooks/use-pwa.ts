import { useState, useEffect } from 'react';
import { logger } from '@/utils/logging';
import { versionService } from '@/services/pwa/versionService';
import { supaToast } from '@/services/supa-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  currentVersion: string | null;
  isUpdating: boolean;
}

export const usePWA = (): PWAHook => {
  const { user } = useAuth();
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
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

    // Load current version
    const loadCurrentVersion = async () => {
      const version = await versionService.getCurrentVersion();
      setCurrentVersion(version?.buildHash || null);
    };

    loadCurrentVersion();

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
    const handleOnline = () => {
      setIsOnline(true);
      // Check for updates when coming back online
      if (user) {
        versionService.checkForUpdates().then(hasUpdate => {
          if (hasUpdate) setNeedsUpdate(true);
        });
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        logger.info('Service worker updated, refresh needed', { module: 'pwa' });
        setNeedsUpdate(true);
      }
    };

    // Register service worker
    const registerServiceWorker = () => {
      if ('serviceWorker' in navigator) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('no-sw') === '1') {
          logger.info('Service Worker registration skipped (no-sw debug mode)', { module: 'pwa' });
          return;
        }

        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            setRegistration(reg);
            logger.info('Service Worker registered successfully', { module: 'pwa' });

            // Check for updates when new SW is found
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    logger.info('New service worker available', { module: 'pwa' });
                    // Only notify authenticated users
                    if (user) {
                      setNeedsUpdate(true);
                    }
                  }
                });
              }
            });

            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
          })
          .catch((error) => {
            logger.error('Service Worker registration failed:', error, { module: 'pwa' });
          });
      }
    };

    // Delay SW registration until window load
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
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
      window.removeEventListener('load', registerServiceWorker);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [user]);

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
    try {
      setIsUpdating(true);
      
      supaToast.info('Updating app...', { persistent: true });
      
      // Use the force cache refresh which clears everything and reloads
      await versionService.forceCacheRefresh();
      
      // Note: forceCacheRefresh will reload the page, so this code won't run
      setNeedsUpdate(false);
      setIsUpdating(false);
      
    } catch (error) {
      logger.error('Error updating app:', error, { module: 'pwa' });
      setIsUpdating(false);
      
      supaToast.show({
        type: 'error',
        title: 'Update Failed',
        message: 'Please try again or manually refresh the page.',
        persistent: true,
        actions: [
          {
            label: 'Force Refresh',
            action: () => versionService.forceCacheRefresh()
          }
        ]
      });
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOnline,
    promptInstall,
    needsUpdate,
    updateApp,
    currentVersion,
    isUpdating,
  };
};
