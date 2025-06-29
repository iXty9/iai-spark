
import React, { useEffect, useState } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { seoService, SeoData } from '@/services/seo-service';
import { settingsCacheService } from '@/services/settings-cache-service';

interface SeoProviderProps {
  children: React.ReactNode;
}

export function SeoProvider({ children }: SeoProviderProps) {
  const [seoData, setSeoData] = useState<SeoData | null>(null);

  useEffect(() => {
    // Load initial SEO data
    const loadSeoData = async () => {
      try {
        const data = await seoService.getSeoData();
        setSeoData(data);
      } catch (error) {
        console.error('Failed to load SEO data:', error);
        // Use fallback data
        setSeoData({
          title: 'Ixty AI - "The Everywhere Intelligent Assistant"',
          description: 'Chat with Ixty AI, the productive AI assistant from iXty9!',
          author: 'Ixty AI',
          ogImageUrl: 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
          twitterHandle: 'ixty_ai',
          faviconUrl: 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
          ogType: 'website'
        });
      }
    };

    loadSeoData();

    // Listen for settings changes
    const unsubscribe = settingsCacheService.addChangeListener((settings) => {
      const newSeoData = {
        title: settings.seo_site_title || 'Ixty AI - "The Everywhere Intelligent Assistant"',
        description: settings.seo_site_description || 'Chat with Ixty AI, the productive AI assistant from iXty9!',
        author: settings.seo_site_author || 'Ixty AI',
        ogImageUrl: settings.seo_og_image_url || 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
        twitterHandle: settings.seo_twitter_handle || 'ixty_ai',
        faviconUrl: settings.seo_favicon_url || 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
        ogType: settings.seo_og_type || 'website'
      };
      setSeoData(newSeoData);
    });

    return unsubscribe;
  }, []);

  return (
    <HelmetProvider>
      {seoData && (
        <Helmet>
          <title>{seoData.title}</title>
          <meta name="description" content={seoData.description} />
          <meta name="author" content={seoData.author} />
          
          {/* Open Graph / Facebook */}
          <meta property="og:title" content={seoData.title} />
          <meta property="og:description" content={seoData.description} />
          <meta property="og:type" content={seoData.ogType} />
          <meta property="og:image" content={seoData.ogImageUrl} />
          
          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content={`@${seoData.twitterHandle}`} />
          <meta name="twitter:title" content={seoData.title} />
          <meta name="twitter:description" content={seoData.description} />
          <meta name="twitter:image" content={seoData.ogImageUrl} />
          
          {/* Favicon */}
          <link rel="icon" href={seoData.faviconUrl} type="image/png" />
          <link rel="apple-touch-icon" href={seoData.faviconUrl} />
        </Helmet>
      )}
      {children}
    </HelmetProvider>
  );
}
