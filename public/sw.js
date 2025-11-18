// Dynamic cache names based on version
let CACHE_VERSION = 'dev-build';
let STATIC_CACHE = `ixty-ai-static-${CACHE_VERSION}`;
let DYNAMIC_CACHE = `ixty-ai-dynamic-${CACHE_VERSION}`;

// Cache static assets
const STATIC_ASSETS = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.css',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png'
];

// Load version info and update cache names
const loadVersion = async () => {
  try {
    const response = await fetch('/version.json', { cache: 'no-cache' });
    if (response.ok) {
      const version = await response.json();
      CACHE_VERSION = version.buildHash;
      STATIC_CACHE = version.cacheNames.static;
      DYNAMIC_CACHE = version.cacheNames.dynamic;
      console.log('Service Worker: Version loaded', version);
    }
  } catch (error) {
    console.error('Service Worker: Failed to load version', error);
  }
};

// Install event - cache static assets with versioned cache names
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    loadVersion().then(() => {
      return caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('Service Worker: Caching static assets with cache:', STATIC_CACHE);
          return cache.addAll(STATIC_ASSETS);
        })
        .catch((error) => {
          console.error('Service Worker: Error caching static assets:', error);
        });
    })
  );
  self.skipWaiting();
});

// Validate manifest structure
const isValidManifest = (manifest) => {
  if (!manifest || typeof manifest !== 'object') {
    return false;
  }
  
  // Check required fields
  const requiredFields = ['name', 'short_name', 'icons'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      return false;
    }
  }
  
  // Validate icons array
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    return false;
  }
  
  return true;
};

// Activate event - clean up old caches AND corrupted manifests
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    loadVersion().then(() => {
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName.startsWith('ixty-ai-') && 
                cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        ).then(() => {
          // Also check and clean corrupted manifest from current cache
          return caches.open(DYNAMIC_CACHE).then(cache => {
            return cache.match('/manifest.json').then(response => {
              if (response) {
                return response.json().then(manifest => {
                  if (!isValidManifest(manifest)) {
                    console.log('Service Worker: Removing corrupted manifest from cache');
                    return cache.delete('/manifest.json');
                  }
                }).catch(() => {
                  // Invalid JSON, delete it
                  console.log('Service Worker: Removing invalid manifest (parse error)');
                  return cache.delete('/manifest.json');
                });
              }
            });
          });
        });
      });
    })
  );
  self.clients.claim();
});

// Handle skip waiting message from update prompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skip waiting requested');
    self.skipWaiting();
    
    // Notify all clients that update is ready
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    });
  }
  
  // Handle cache invalidation requests
  if (event.data && event.data.type === 'INVALIDATE_CACHE') {
    const patterns = event.data.patterns || [];
    console.log('Service Worker: Cache invalidation requested for patterns:', patterns);
    
    caches.open(DYNAMIC_CACHE).then(cache => {
      cache.keys().then(requests => {
        const deletionPromises = requests
          .filter(request => {
            const url = request.url;
            return patterns.some(pattern => url.includes(pattern));
          })
          .map(request => {
            console.log('Service Worker: Deleting cached entry:', request.url);
            return cache.delete(request);
          });
        
        return Promise.all(deletionPromises);
      }).then(() => {
        console.log('Service Worker: Cache invalidation complete');
        event.ports[0]?.postMessage({ success: true });
      });
    }).catch(error => {
      console.error('Service Worker: Cache invalidation failed:', error);
      event.ports[0]?.postMessage({ success: false, error: error.message });
    });
  }
  
  if (event.data && event.data.type === 'UPDATE_MANIFEST') {
    // Cache the new manifest data with validation
    const manifest = event.data.manifest;
    console.log('Service Worker: Received manifest update request:', manifest);
    
    // Validate manifest before caching
    if (!isValidManifest(manifest)) {
      console.error('Service Worker: Manifest validation failed, rejecting update', manifest);
      // Notify sender of failure
      if (event.source) {
        event.source.postMessage({ 
          type: 'MANIFEST_UPDATE_FAILED', 
          error: 'Invalid manifest structure' 
        });
      }
      return;
    }
    
    // Store validated manifest in cache
    caches.open(DYNAMIC_CACHE).then(cache => {
      const manifestResponse = new Response(JSON.stringify(manifest), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put('/manifest.json', manifestResponse);
      console.log('Service Worker: Manifest cached successfully');
    }).catch(error => {
      console.error('Service Worker: Failed to cache manifest', error);
    });
    
    // Notify clients about successful manifest update
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'MANIFEST_UPDATED', manifest });
      });
    });
  }
});

// Helper: Check if URL is a Supabase API call
const isSupabaseApiCall = (url) => {
  return url.hostname.includes('.supabase.co') || 
         url.pathname.includes('/rest/v1/') ||
         url.pathname.includes('/auth/v1/') ||
         url.pathname.includes('/storage/v1/');
};

// Fetch event - network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests except for allowed domains
  const allowedDomains = ['fonts.googleapis.com', 'fonts.gstatic.com', 'ixty9.com', 'supabase.co'];
  if (url.origin !== self.location.origin && !allowedDomains.some(domain => url.hostname.includes(domain))) {
    return;
  }

  // NETWORK-FIRST for Supabase API calls (dynamic data)
  if (isSupabaseApiCall(url)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful responses for short time (offline fallback)
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              // Cache with short expiration metadata
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(error => {
          console.log('Service Worker: Network error for API call, trying cache:', url.pathname);
          // Fallback to cache only if network fails (offline)
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              console.log('Service Worker: Serving stale API data from cache (offline)');
              return cachedResponse;
            }
            throw error;
          });
        })
    );
    return;
  }

  // Always fetch manifest.json fresh from network
  if (url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(request.url + '?t=' + Date.now())
        .then((response) => {
          if (response && response.status === 200) {
            // Do NOT cache manifest.json
            return response;
          }
          throw new Error('Manifest fetch failed');
        })
        .catch((error) => {
          console.error('Failed to fetch manifest.json:', error);
          return new Response('{}', {
            status: 404,
            headers: { 'Content-Type': 'application/manifest+json' }
          });
        })
    );
    return;
  }

  // Always fetch version.json fresh from network
  if (url.pathname === '/version.json') {
    event.respondWith(
      fetch(request.url + '?t=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      .then((response) => {
        if (response && response.status === 200) {
          // Do NOT cache version.json at all
          return response;
        }
        throw new Error('Network response was not ok');
      })
      .catch((error) => {
        console.error('Failed to fetch version.json:', error);
        // No fallback to cache - version checks should fail if offline
        return new Response(JSON.stringify({ 
          error: 'Offline', 
          version: 'unknown',
          buildHash: 'offline'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Skip TypeScript files in development
  if (url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) {
    return;
  }

  // CACHE-FIRST strategy for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('Service Worker: Fetch error:', error);
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return new Response(
                '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            }
            
            throw error;
          });
      })
  );
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
      badge: 'https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png',
      vibrate: [100, 50, 100],
      data: data.data
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});
