
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logging';
import { versionService } from '@/services/pwa/versionService';
import { supaToast } from '@/services/supa-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useApplicationMode } from '@/hooks/use-application-mode';

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
  const { isDevelopmentMode } = useApplicationMode();
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
      // Check for updates when coming back online, but only for authenticated users
      if (user) {
        versionService.checkForUpdates(true);
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        logger.info('Service worker updated, refresh needed', { module: 'pwa' });
        // Don't set needsUpdate here - let version service handle it to avoid duplicates
      }
    };

    // Register service worker - delayed until window load to avoid race conditions
    // Skip registration if ?no-sw=1 is in URL (emergency debug mode)
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
    };

    // Delay SW registration until window load
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
    }

    // Set up version service update listener
    versionService.onUpdateAvailable((hasUpdate) => {
      // In development mode: don't show notifications (silent updates only)
      // In production mode: only show to authenticated users
      const shouldShowNotification = isDevelopmentMode ? false : !!user;
      
      if (!shouldShowNotification) {
        logger.info('Update notification suppressed', { 
          reason: isDevelopmentMode ? 'development mode - silent updates' : 'production mode - anonymous user',
          user: !!user,
          isDevelopmentMode
        }, { module: 'use-pwa' });
        return;
      }
      
      setNeedsUpdate(hasUpdate);
      // Only show update notification if app is installed as PWA and user is authenticated
      if (hasUpdate) {
        // Check current installed state at the time of update
        const currentIsStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const currentIsIOSStandalone = (window.navigator as any).standalone === true;
        const currentIsInstalled = currentIsStandalone || currentIsIOSStandalone;
        
        if (currentIsInstalled) {
          showUpdateNotification();
        }
      }
    });

    // Start periodic version checks only for authenticated users
    if (user) {
      versionService.startPeriodicChecks();
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
      message: 'A new version is ready with improvements and fixes. Your preferences will be preserved.',
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
    // Try to get current registration if not available
    let currentRegistration = registration;
    if (!currentRegistration && 'serviceWorker' in navigator) {
      currentRegistration = await navigator.serviceWorker.getRegistration();
    }

    if (!currentRegistration) {
      logger.warn('No service worker registration available', { module: 'pwa' });
      supaToast.error('Update failed: Service worker not available');
      return;
    }

    try {
      setIsUpdating(true);
      
      supaToast.info('Preparing update...', { persistent: true });
      
      // Perform cache cleanup first
      await versionService.performCacheCleanup();
      
      supaToast.info('Installing update...', { persistent: true });
      
      // Get the latest version info
      const remoteVersion = await versionService.fetchRemoteVersion();
      if (remoteVersion) {
        await versionService.updateToVersion(remoteVersion);
        setCurrentVersion(remoteVersion.buildHash);
      }

      // Clear browser caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Tell the service worker to skip waiting and activate
      if (currentRegistration.waiting) {
        currentRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Wait for the service worker to activate
        await new Promise<void>((resolve) => {
          const handleControllerChange = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
          
          // Fallback timeout
          setTimeout(resolve, 3000);
        });
      } else {
        // If no waiting worker, force update check
        await currentRegistration.update();
        
        // Wait a bit for the new worker to be installed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      setNeedsUpdate(false);
      setIsUpdating(false);
      
      supaToast.success('Update complete! Reloading with latest version...', { duration: 3000 });
      
      // Reload the page with cache bypass after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
      logger.info('App update completed successfully', { module: 'pwa' });
    } catch (error) {
      logger.error('Error updating app:', error, { module: 'pwa' });
      setIsUpdating(false);
      
      supaToast.show({
        type: 'error',
        title: 'Update Failed',
        message: 'Trying alternative update method...',
        persistent: true,
        actions: [
          {
            label: 'Force Update',
            action: () => versionService.forceCacheRefresh()
          },
          {
            label: 'Try Again',
            action: () => updateApp()
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
