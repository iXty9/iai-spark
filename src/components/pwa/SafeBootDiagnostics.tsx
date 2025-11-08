import { useState, useEffect } from 'react';
import { logger } from '@/utils/logging';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

export const SafeBootDiagnostics = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Check if app has rendered
      const appContent = document.querySelector('[data-app-content]');
      if (!appContent) {
        logger.warn('App content not rendered after 5 seconds, showing recovery UI', { module: 'safe-boot' });
        setShowOverlay(true);
        
        // Run diagnostics
        const results: string[] = [];
        
        // Check manifest
        try {
          const manifestResponse = await fetch(`/manifest.json?t=${Date.now()}`, { cache: 'no-store' });
          const contentType = manifestResponse.headers.get('content-type') || 'unknown';
          results.push(`Manifest: ${contentType.includes('json') ? '✓ Valid JSON' : '✗ Invalid (not JSON)'}`);
          
          if (contentType.includes('json')) {
            const text = await manifestResponse.text();
            results.push(`Size: ${text.length} bytes`);
          }
        } catch (err) {
          results.push(`Manifest: ✗ Fetch failed - ${err}`);
        }
        
        // Check version
        try {
          const versionResponse = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
          const contentType = versionResponse.headers.get('content-type') || 'unknown';
          results.push(`Version: ${contentType.includes('json') ? '✓ Valid JSON' : '✗ Invalid (not JSON)'}`);
        } catch (err) {
          results.push(`Version: ✗ Fetch failed - ${err}`);
        }
        
        // Check service worker
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          results.push(`Service Worker: ${registration ? '✓ Registered' : '✗ Not registered'}`);
        } else {
          results.push('Service Worker: Not supported');
        }
        
        setDiagnostics(results);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleReload = () => {
    setIsRecovering(true);
    // Force reload with cache bypass
    window.location.href = `${window.location.origin}${window.location.pathname}?t=${Date.now()}`;
  };

  const handleUnregisterAndReload = async () => {
    setIsRecovering(true);
    
    try {
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        logger.info('Unregistered all service workers', { module: 'safe-boot' });
      }
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        logger.info('Cleared all caches', { module: 'safe-boot' });
      }
      
      // Reload
      setTimeout(() => {
        window.location.href = `${window.location.origin}${window.location.pathname}?t=${Date.now()}`;
      }, 500);
    } catch (error) {
      logger.error('Error during recovery', error, { module: 'safe-boot' });
      handleReload();
    }
  };

  if (!showOverlay) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        color: '#0a0a0a',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <AlertCircle size={24} style={{ color: '#dd3333' }} />
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>App Loading Issue Detected</h2>
        </div>
        
        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
          The app is taking longer than expected to load. This might be due to cached data or service worker issues.
        </p>
        
        {diagnostics.length > 0 && (
          <div style={{
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            {diagnostics.map((diag, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>{diag}</div>
            ))}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          <Button
            onClick={handleReload}
            disabled={isRecovering}
            style={{
              width: '100%',
              backgroundColor: '#dd3333',
              color: '#ffffff',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              cursor: isRecovering ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={16} />
            {isRecovering ? 'Reloading...' : 'Reload (Bypass Cache)'}
          </Button>
          
          <Button
            onClick={handleUnregisterAndReload}
            disabled={isRecovering}
            variant="outline"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#ffffff',
              color: '#0a0a0a',
              cursor: isRecovering ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Trash2 size={16} />
            Clear Cache & Service Worker
          </Button>
          
          <button
            onClick={() => setShowOverlay(false)}
            disabled={isRecovering}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#666',
              cursor: isRecovering ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Dismiss (wait longer)
          </button>
        </div>
      </div>
    </div>
  );
};
