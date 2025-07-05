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

// Activate event - clean up old caches
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
        );
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
});

// Fetch event - network-first for version and critical files, cache-first for others
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests except allowed domains
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith('https://fonts.googleapis.com') &&
      !event.request.url.startsWith('https://ixty9.com')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Network-first strategy for version.json and critical app files
  if (url.pathname === '/version.json' || 
      url.pathname.endsWith('.tsx') || 
      url.pathname.endsWith('.ts') ||
      url.pathname === '/manifest.json') {
    
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            // Cache the updated file
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return response;
          }
          throw new Error('Network response was not ok');
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first strategy for other assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((fetchResponse) => {
            // Check if we received a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Clone the response for caching
            const responseToCache = fetchResponse.clone();

            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return fetchResponse;
          })
          .catch((error) => {
            console.log('Service Worker: Fetch failed, serving offline page:', error);
            
            // For navigation requests, return a basic offline page
            if (event.request.mode === 'navigate') {
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <title>Ixty AI - Offline</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                           text-align: center; padding: 2rem; background: #f8f9fa; }
                    .container { max-width: 400px; margin: 0 auto; }
                    h1 { color: #dd3333; }
                    p { color: #666; line-height: 1.5; }
                    button { background: #dd3333; color: white; border: none; padding: 10px 20px; 
                            border-radius: 5px; cursor: pointer; margin-top: 1rem; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>Ixty AI</h1>
                    <p>You're currently offline. Please check your internet connection and try again.</p>
                    <button onclick="window.location.reload()">Retry</button>
                  </div>
                </body>
                </html>`,
                {
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            }
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
