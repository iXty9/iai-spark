import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

export interface PWAManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  orientation: string;
  scope: string;
  categories: string[];
  lang: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: string;
  }>;
}

const DEFAULT_MANIFEST: PWAManifest = {
  name: "Ixty AI - The Everywhere Intelligent Assistant",
  short_name: "Ixty AI",
  description: "Chat with Ixty AI, the productive AI assistant from iXty9!",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#dd3333",
  orientation: "portrait-primary",
  scope: "/",
  categories: ["productivity", "business", "utilities"],
  lang: "en",
  icons: [
    {
      src: "https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable"
    },
    {
      src: "https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable"
    }
  ]
};

export const generateManifestFromSettings = async (): Promise<PWAManifest> => {
  try {
    logger.info('Generating PWA manifest from settings', null, { module: 'pwa-manifest' });
    
    const settings = await fetchAppSettings();
    
    // Parse categories safely
    let categories: string[] = DEFAULT_MANIFEST.categories;
    try {
      if (settings.pwa_categories) {
        categories = JSON.parse(settings.pwa_categories);
      }
    } catch (error) {
      logger.warn('Failed to parse PWA categories, using defaults', error, { module: 'pwa-manifest' });
    }
    
    // Use icon URL or fall back to default
    const iconUrl = settings.pwa_icon_url || DEFAULT_MANIFEST.icons[0].src;
    
    const manifest: PWAManifest = {
      name: settings.pwa_app_name || DEFAULT_MANIFEST.name,
      short_name: settings.pwa_short_name || DEFAULT_MANIFEST.short_name,
      description: settings.pwa_description || DEFAULT_MANIFEST.description,
      start_url: settings.pwa_start_url || DEFAULT_MANIFEST.start_url,
      display: settings.pwa_display_mode || DEFAULT_MANIFEST.display,
      background_color: settings.pwa_background_color || DEFAULT_MANIFEST.background_color,
      theme_color: settings.pwa_theme_color || DEFAULT_MANIFEST.theme_color,
      orientation: settings.pwa_orientation || DEFAULT_MANIFEST.orientation,
      scope: settings.pwa_scope || DEFAULT_MANIFEST.scope,
      categories: categories,
      lang: settings.pwa_lang || DEFAULT_MANIFEST.lang,
      icons: [
        {
          src: iconUrl,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: iconUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };
    
    logger.info('PWA manifest generated successfully', { manifest }, { module: 'pwa-manifest' });
    return manifest;
    
  } catch (error) {
    logger.error('Failed to generate PWA manifest, using defaults', error, { module: 'pwa-manifest' });
    return DEFAULT_MANIFEST;
  }
};

const validateManifest = (manifest: PWAManifest): boolean => {
  if (!manifest || typeof manifest !== 'object') {
    logger.error('Manifest validation failed: not an object', null, { module: 'pwa-manifest' });
    return false;
  }
  
  // Check required fields
  const requiredFields: (keyof PWAManifest)[] = ['name', 'short_name', 'icons'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      logger.error(`Manifest validation failed: missing required field "${field}"`, null, { module: 'pwa-manifest' });
      return false;
    }
  }
  
  // Validate icons array
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    logger.error('Manifest validation failed: icons must be a non-empty array', null, { module: 'pwa-manifest' });
    return false;
  }
  
  // Validate each icon has required properties
  for (const icon of manifest.icons) {
    if (!icon.src || !icon.sizes || !icon.type) {
      logger.error('Manifest validation failed: icon missing required properties', icon, { module: 'pwa-manifest' });
      return false;
    }
  }
  
  logger.info('Manifest validation passed', null, { module: 'pwa-manifest' });
  return true;
};

export const updateManifestFile = async (): Promise<boolean> => {
  try {
    const manifest = await generateManifestFromSettings();
    
    // Validate manifest before attempting to cache
    if (!validateManifest(manifest)) {
      logger.error('Generated manifest is invalid, aborting update', manifest, { module: 'pwa-manifest' });
      return false;
    }
    
    // Update the manifest via service worker
    try {
      // In a browser environment, we'll use the service worker to cache the new manifest
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_MANIFEST',
          manifest: manifest
        });
        
        logger.info('Manifest update message sent to service worker', { manifest }, { module: 'pwa-manifest' });
      } else {
        logger.warn('Service worker not available, manifest update skipped', null, { module: 'pwa-manifest' });
      }
      
      logger.info('Manifest update completed successfully', null, { module: 'pwa-manifest' });
      return true;
    } catch (updateError) {
      logger.error('Failed to send manifest update to service worker', updateError, { module: 'pwa-manifest' });
      return false;
    }
  } catch (error) {
    logger.error('Failed to update manifest file', error, { module: 'pwa-manifest' });
    return false;
  }
};

export const getManifestUrl = (): string => {
  // For dynamic manifest, we could serve from /api/manifest
  // For now, use the static manifest with cache busting
  const timestamp = Date.now();
  return `/manifest.json?v=${timestamp}`;
};
