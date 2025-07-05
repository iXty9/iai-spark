
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logging';
import { versionService } from '@/services/pwa/versionService';
import { supaToast } from '@/services/supa-toast';

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
      versionService.checkForUpdates();
    };
    
    const handleOffline = () => setIsOnline(false);

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        logger.info('Service worker updated, refresh needed', { module: 'pwa' });
        // Don't set needsUpdate here - let version service handle it to avoid duplicates
      }
    };

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
                  logger.info('New service worker available', { module: 'pwa' });
                  // Let version service handle update detection to avoid duplicates
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

    // Set up version service update listener
    versionService.onUpdateAvailable((hasUpdate) => {
      setNeedsUpdate(hasUpdate);
      if (hasUpdate) {
        showUpdateNotification();
      }
    });

    // Start periodic version checks
    versionService.startPeriodicChecks();

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
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      
      versionService.stopPeriodicChecks();
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

  const showUpdateNotification = () => {
    let toastId: string;
    
    toastId = supaToast.show({
      type: 'info',
      title: 'Update Available',
      message: 'A new version of Ixty AI is ready to install',
      persistent: true,
      actions: [
        {
          label: 'Update Now',
          action: () => {
            supaToast.dismiss(toastId);
            updateApp();
          }
        },
        {
          label: 'Later',
          action: () => supaToast.dismiss(toastId)
        }
      ]
    });
  };

  const updateApp = async (): Promise<void> => {
    if (!registration) {
      logger.warn('No service worker registration available', { module: 'pwa' });
      supaToast.error('Update failed: Service worker not available');
      return;
    }

    try {
      setIsUpdating(true);
      
      supaToast.info('Installing update...', { persistent: true });
      
      // Get the latest version info
      const remoteVersion = await versionService.fetchRemoteVersion();
      if (remoteVersion) {
        await versionService.updateToVersion(remoteVersion);
        setCurrentVersion(remoteVersion.buildHash);
      }

      // Tell the service worker to skip waiting and activate
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Wait for the service worker to activate
        await new Promise<void>((resolve) => {
          const handleControllerChange = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        });
      } else {
        // If no waiting worker, force update check
        await registration.update();
        
        // Wait a bit for the new worker to be installed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      setNeedsUpdate(false);
      setIsUpdating(false);
      
      supaToast.success('Update installed! Reloading...', { duration: 2000 });
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
      logger.info('App update completed successfully', { module: 'pwa' });
    } catch (error) {
      logger.error('Error updating app:', error, { module: 'pwa' });
      setIsUpdating(false);
      supaToast.error('Update failed. Please try again.');
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
