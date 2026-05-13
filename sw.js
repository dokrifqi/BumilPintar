const CACHE_NAME = 'bumil-pintar-v3';
const ASSETS = [
  '/',
  '/bumil_pintar.html',
  '/manifest.json',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-256.png',
  '/icon-384.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/screenshot.png',
  '/screenshot2.png',
  '/screenshot3.png',
  '/screenshot-wide.png'
];

// Install - cache semua aset
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - hapus cache lama
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch - cache first, network fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/bumil_pintar.html'));
    })
  );
});

// Background sync placeholder
self.addEventListener('sync', e => {
  console.log('Background sync:', e.tag);
});

// Push notification
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Bumil Pintar', body: 'Ada pengingat kehamilan untuk Anda!' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'Bumil Pintar', {
      body: data.body || 'Ada pengingat kehamilan untuk Anda!',
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/'));
});
