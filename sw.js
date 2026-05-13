const CACHE_NAME = 'bumil-pintar-v4';
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

// Activate - hapus cache lama + claim clients
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

// Background sync - sync data saat online
self.addEventListener('sync', e => {
  if (e.tag === 'sync-data') {
    e.waitUntil(
      fetch('/api/sync', { method: 'POST' })
        .then(() => {
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({ type: 'SYNC_COMPLETE' });
            });
          });
        })
        .catch(() => e.lastChance && console.error('Sync failed'))
    );
  }
});

// Periodic background sync - check setiap jam
self.addEventListener('periodicsync', e => {
  if (e.tag === 'update-reminders') {
    e.waitUntil(
      fetch('/api/reminders')
        .then(r => r.json())
        .then(reminders => {
          reminders.forEach(r => {
            self.registration.showNotification(r.title, {
              body: r.body,
              icon: '/icon-192.png',
              badge: '/icon-96.png',
              tag: r.id,
              data: { url: r.url || '/' }
            });
          });
        })
        .catch(() => console.error('Reminder fetch failed'))
    );
  }
});

// Push notification
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {
    title: 'Bumil Pintar',
    body: 'Ada pengingat kehamilan untuk Anda!',
    icon: '/icon-192.png'
  };
  e.waitUntil(
    self.registration.showNotification(data.title || 'Bumil Pintar', {
      body: data.body || 'Ada pengingat kehamilan untuk Anda!',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-96.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'bumil-notification',
      requireInteraction: data.requireInteraction || false,
      data: { url: data.url || '/' }
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        clientList[0].focus();
        clientList[0].navigate(e.notification.data.url || '/');
      } else {
        clients.openWindow(e.notification.data.url || '/');
      }
    })
  );
});

// Message handler - untuk komunikasi dengan app
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'REGISTER_PERIODIC_SYNC') {
    self.registration.periodicSync.register('update-reminders', {
      minInterval: 60 * 60 * 1000 // 1 jam
    }).catch(() => console.log('Periodic sync registration failed'));
  }
});
