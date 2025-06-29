
import { settingsCacheService } from '@/services/settings-cache-service';

export interface SeoData {
  title: string;
  description: string;
  author: string;
  ogImageUrl: string;
  twitterHandle: string;
  faviconUrl: string;
  ogType: string;
}

class SeoService {
  private static instance: SeoService | null = null;

  static getInstance(): SeoService {
    if (!this.instance) {
      this.instance = new SeoService();
    }
    return this.instance;
  }

  async getSeoData(): Promise<SeoData> {
    try {
      const settings = await settingsCacheService.getSettings();
      
      return {
        title: settings.seo_site_title || 'Ixty AI - "The Everywhere Intelligent Assistant"',
        description: settings.seo_site_description || 'Chat with Ixty AI, the productive AI assistant from iXty9!',
        author: settings.seo_site_author || 'Ixty AI',
        ogImageUrl: settings.seo_og_image_url || 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
        twitterHandle: settings.seo_twitter_handle || 'ixty_ai',
        faviconUrl: settings.seo_favicon_url || 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
        ogType: settings.seo_og_type || 'website'
      };
    } catch (error) {
      console.error('Failed to load SEO data:', error);
      // Return fallback values
      return {
        title: 'Ixty AI - "The Everywhere Intelligent Assistant"',
        description: 'Chat with Ixty AI, the productive AI assistant from iXty9!',
        author: 'Ixty AI',
        ogImageUrl: 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
        twitterHandle: 'ixty_ai',
        faviconUrl: 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
        ogType: 'website'
      };
    }
  }

  getCurrentSeoData(): SeoData {
    const settings = settingsCacheService;
    
    return {
      title: settings.getSetting('seo_site_title', 'Ixty AI - "The Everywhere Intelligent Assistant"'),
      description: settings.getSetting('seo_site_description', 'Chat with Ixty AI, the productive AI assistant from iXty9!'),
      author: settings.getSetting('seo_site_author', 'Ixty AI'),
      ogImageUrl: settings.getSetting('seo_og_image_url', 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png'),
      twitterHandle: settings.getSetting('seo_twitter_handle', 'ixty_ai'),
      faviconUrl: settings.getSetting('seo_favicon_url', 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png'),
      ogType: settings.getSetting('seo_og_type', 'website')
    };
  }
}

export const seoService = SeoService.getInstance();
