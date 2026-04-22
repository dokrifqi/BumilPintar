// ============================================
// Bumil Pintar — Service Worker (PWA)
// Cache Strategy: Cache First → fallback Network
// ============================================

const CACHE_NAME    = 'bumil-pintar-v1';
const OFFLINE_URL   = '/';

// File yang di-cache saat install
const PRECACHE_URLS = [
  '/',
  '/bumil_pintar.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── INSTALL: cache semua asset utama ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching assets...');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: hapus cache lama ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Cache First, fallback ke Network ──
self.addEventListener('fetch', event => {
  // Abaikan request non-GET dan request ke domain lain
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Tidak ada di cache → ambil dari network, simpan ke cache
      return fetch(event.request).then(response => {
        // Hanya cache response yang valid
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, toCache);
        });
        return response;
      }).catch(() => {
        // Network error → kembalikan halaman utama dari cache
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});
