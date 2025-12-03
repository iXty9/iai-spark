// BUILD_HASH is replaced at build time - when this changes, browser downloads new sw.js
const BUILD_HASH = '__BUILD_HASH__';

// Single cache for offline fallback only
const OFFLINE_CACHE = `ixty-offline-${BUILD_HASH}`;

// Minimal assets for offline fallback
const OFFLINE_ASSETS = [
  '/',
  '/offline.html'
];

console.log('Service Worker: Loading with BUILD_HASH:', BUILD_HASH);

// Install event - cache minimal offline assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing with hash:', BUILD_HASH);
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching offline assets');
        // Only cache what exists, ignore failures
        return Promise.allSettled(
          OFFLINE_ASSETS.map(url => 
            cache.add(url).catch(() => console.log('Could not cache:', url))
          )
        );
      })
  );
  // Take over immediately
  self.skipWaiting();
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating with hash:', BUILD_HASH);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL caches except current offline cache
          if (cacheName !== OFFLINE_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skip waiting requested');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    console.log('Service Worker: Clear all caches requested');
    caches.keys().then((names) => {
      return Promise.all(names.map(name => caches.delete(name)));
    }).then(() => {
      console.log('Service Worker: All caches cleared');
      event.ports[0]?.postMessage({ success: true });
    });
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ buildHash: BUILD_HASH });
  }
});

// NETWORK-FIRST for everything - cache only as offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests except for allowed domains
  const allowedDomains = ['fonts.googleapis.com', 'fonts.gstatic.com', 'supabase.co'];
  if (url.origin !== self.location.origin && !allowedDomains.some(domain => url.hostname.includes(domain))) {
    return;
  }

  // Skip TypeScript files in development
  if (url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) {
    return;
  }

  // NETWORK-FIRST strategy for ALL requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses for offline fallback
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(OFFLINE_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch((error) => {
        console.log('Service Worker: Network failed, trying cache:', url.pathname);
        
        // Network failed - serve from cache (offline mode)
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('Service Worker: Serving from cache (offline):', url.pathname);
            return cachedResponse;
          }
          
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/').then((indexResponse) => {
              if (indexResponse) return indexResponse;
              return new Response(
                '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
          }
          
          throw error;
        });
      })
  );
});

// Handle push notifications
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
