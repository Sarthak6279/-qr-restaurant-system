// =========================================================================
// COFFEE CULTURE — SERVICE WORKER FOR 100% OFFLINE FUNCTIONALITY
// =========================================================================

const CACHE_NAME = 'coffee-culture-cache-v15';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/customer.js',
  '/js/dashboard.js',
  '/js/qr-generator.js',
  '/js/sound.js',
  '/assets/coffee_culture_wall.png',
  '/assets/coffee_culture_lounge.png',
  '/manifest.json'
];

// Install Event — pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('☕ [Service Worker] Pre-caching Coffee Culture App Shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('☕ Some assets could not be cached immediately:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event — cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('☕ [Service Worker] Clearing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event — Network first with cache fallback, or cache first for static files
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Handle API requests (Network first with cache fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) {
            return cached;
          }
          // Return synthetic offline response for menu if needed
          return new Response(JSON.stringify({ offline: true, error: 'Offline mode active' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Handle Static Assets (Stale-While-Revalidate or Cache-First)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
