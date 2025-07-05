
import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';
import { versionService } from './versionService';

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

export const updateManifestFile = async (): Promise<boolean> => {
  try {
    const manifest = await generateManifestFromSettings();
    
    // In a real implementation, this would update the public/manifest.json file
    // For now, we'll trigger a version update to ensure PWA users get the changes
    const currentVersion = await versionService.getCurrentVersion();
    if (currentVersion) {
      const newVersion = {
        ...currentVersion,
        buildTime: new Date().toISOString()
      };
      await versionService.updateToVersion(newVersion);
    }
    
    logger.info('Manifest update triggered', { manifest }, { module: 'pwa-manifest' });
    return true;
  } catch (error) {
    logger.error('Failed to update manifest file', error, { module: 'pwa-manifest' });
    return false;
  }
};
