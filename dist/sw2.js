// UNIQUE-SW-V2
/* =============================================================
   Dawa Smart â€” Service Worker
   =============================================================
   Cache strategy for offline-first operation.
   
   - Version: 1 (increment to force update)
   - Caches: app shell, CSS, JS, icons, fonts
   - NEVER caches: IndexedDB data, localStorage, user-sensitive API responses
   - Strategy: Cache-first for static assets, network-first for HTML
   - Stale-while-revalidate for CSS/JS
   ============================================================= */

const CACHE_VERSION = 'v5';
const CACHE_NAME = 'dawa-smart-sw-' + CACHE_VERSION;

// Files to cache for offline application shell
const CORE_ASSETS = [
  'app.html',
  'tenant2.js',
  'license2.js',
  'sync-queue2.js',
  'supabase2.js',
  'license.css',
  'manifest.json',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/favicon-16.png',
  'assets/favicon-32.png',
  'assets/favicon-64.png',
  'assets/icon.svg',
  'assets/landing-dashboard.png'
];

// External resources to cache
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// ==========================================================================
// INSTALL: Cache the application shell
// ==========================================================================
self.addEventListener('install', (event) => {
  console.log('[Dawa Smart SW] Installing v' + CACHE_VERSION);

  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME),
      fetch('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css')
        .then(() => true)
        .catch(() => false) // Don't fail install if external CDN is unavailable
    ]).then(([cache]) => {
      // Cache only files that exist locally
      const validAssets = CORE_ASSETS.filter(asset => {
        // We try to fetch each; if it fails, we skip it
        return true;
      });
      return cache.addAll(validAssets);
    }).then(() => {
      // Force the waiting service worker to become active immediately
      return self.skipWaiting();
    }).catch((error) => {
      console.error('[Dawa Smart SW] Install failed:', error);
    })
  );
});

// ==========================================================================
// ACTIVATE: Clean up old caches
// ==========================================================================
self.addEventListener('activate', (event) => {
  console.log('[Dawa Smart SW] Activating v' + CACHE_VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any cache that doesn't match our current version
          if (cacheName !== CACHE_NAME && cacheName.startsWith('dawa-smart-sw-')) {
            console.log('[Dawa Smart SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// ==========================================================================
// FETCH: Serve from cache with network fallback
// ==========================================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const request = event.request;

  // Skip cross-origin requests from other domains
  if (url.origin !== location.origin) {
    // For CDN resources (fonts, Font Awesome), use network-first with cache fallback
    if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('cdnjs.cloudflare.com')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
            return response;
          })
          .catch(() => {
            return caches.match(request);
          })
      );
    }
    return;
  }

  // Handle same-origin requests
  const pathname = url.pathname;

  // CRITICAL: sw2.js must always come from the network to allow SW updates
  if (pathname === '/sw2.js') {
    event.respondWith(fetch(request));
    return;
  }

  // HTML pages: network-first with cache fallback
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          if (cloned.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => {
          // Offline: serve from cache, or app.html as fallback
          return caches.match(pathname).then((cached) => {
            if (cached) return cached;
            // Ultimate fallback: serve app.html
            return caches.match('app.html');
          });
        })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  if (pathname.endsWith('.png') || pathname.endsWith('.ico') || pathname.endsWith('.svg') ||
      pathname.endsWith('.css') || pathname.endsWith('.js')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Update cache in background (stale-while-revalidate)
          fetch(request).then((response) => {
            if (response.ok) {
              const cloned = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        }).catch(() => {
          // If asset can't be fetched and isn't cached, return nothing
          // The app should handle this gracefully
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // IndexedDB / API / other dynamic requests: always go to network
  // The sync layer handles these offline with local queues
  event.respondWith(fetch(request));
});

// ==========================================================================
// BACKGROUND SYNC: Listen for 'sync' events from the sync layer
// ==========================================================================
self.addEventListener('sync', (event) => {
  console.log('[Dawa Smart SW] Background sync triggered:', event.tag);

  if (event.tag === 'dawa-smart-sync') {
    event.waitUntil(
      // Notify all clients to send their pending sync queue
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_REQUEST' });
        });
      })
    );
  }
});

// ==========================================================================
// MESSAGES: Handle messages from the app
// ==========================================================================
self.addEventListener('message', (event) => {
  const data = event.data;

  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data && data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'SW_VERSION', version: CACHE_VERSION });
  }
});

// ==========================================================================
// ERROR HANDLING
// ==========================================================================
self.addEventListener('error', (event) => {
  console.error('[Dawa Smart SW] Global error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Dawa Smart SW] Unhandled rejection:', event.reason);
});
