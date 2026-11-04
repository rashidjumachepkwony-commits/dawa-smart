// UNIQUE-SW-V3
/* =============================================================
   Dawa Smart — Service Worker
   =============================================================
   Cache strategy for offline-first operation.
   
   - Version: 8 (increment to force update)
   - Caches: app shell, CSS, JS, icons, fonts
   - NEVER caches: IndexedDB data, localStorage, user-sensitive API responses
   - Strategy: Cache-first for static assets, network-first for HTML
   - Stale-while-revalidate for CSS/JS
   ============================================================= */

const CACHE_VERSION = 'v9';
const CACHE_NAME = 'dawa-smart-sw-' + CACHE_VERSION;

// Files to cache for offline application shell
const CORE_ASSETS = [
  '/app',
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
        .then(r => r.text())
        .then(css => caches.open(CACHE_NAME).then(cache => cache.put('font-awesome.css', new Response(css, { headers: { 'Content-Type': 'text/css' } }))))
    ]).then(([cache]) => {
      // Cache core assets
      cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'no-store' }))).catch(() => {});
      // Cache external assets
      EXTERNAL_ASSETS.forEach(url => {
        fetch(url).then(r => {
          if (r.ok) {
            const cacheName = url.includes('font-awesome') ? CACHE_NAME : CACHE_NAME;
            caches.open(cacheName).then(c => c.put(url, r.clone()));
          }
        }).catch(() => {});
      });
    })
  );

  self.skipWaiting();
});

// ==========================================================================
// ACTIVATE: Clean up old caches
// ==========================================================================
self.addEventListener('activate', (event) => {
  console.log('[Dawa Smart SW] Activating v' + CACHE_VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Dawa Smart SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ==========================================================================
// FETCH: Handle requests
// ==========================================================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // CRITICAL: SW must always come from the network to allow SW updates
  if (pathname === '/sw.js' || pathname === '/sw2.js') {
    event.respondWith(fetch(request));
    return;
  }

  // Handle root path and manifest.json - redirect to /app
  if (pathname === '/' || pathname === '/manifest.json') {
    const targetPath = pathname === '/' ? '/app' : '/manifest.json';
    const targetUrl = new URL(targetPath, url.origin);
    event.respondWith(
      fetch(targetUrl, { redirect: 'follow' })
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(targetUrl, cloned));
          }
          return response;
        })
        .catch(() => caches.match(targetUrl))
    );
    return;
  }

  // HTML pages: network-first with cache fallback
  // Cloudflare Pages redirects /app.html -> /app, so normalize
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    let targetPath = pathname === '/app.html' ? '/app' : pathname;
    const targetUrl = new URL(targetPath, url.origin);
    
    event.respondWith(
      fetch(targetUrl, { redirect: 'follow' })
        .then((response) => {
          const cloned = response.clone();
          if (cloned.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(targetUrl, cloned));
          }
          return response;
        })
        .catch(() => {
          // Offline: serve from cache
          return caches.match(targetUrl).then((cached) => {
            if (cached) return cached;
            return caches.match('/app');
          });
        })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  if (pathname.endsWith('.png') || pathname.endsWith('.ico') || pathname.endsWith('.svg') ||
      pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.json') ||
      pathname === '/favicon.ico' || pathname.startsWith('/assets/')) {
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
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // External fonts/CDN: cache-first
  if (url.hostname !== location.hostname) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }
});

// ==========================================================================
// MESSAGE: Handle skip waiting
// ==========================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Dawa Smart SW] Loaded v' + CACHE_VERSION);