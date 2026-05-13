const CACHE_NAME = 'bumil-pintar-v5';
const RUNTIME_CACHE = 'bumil-pintar-runtime';

const ASSETS_TO_CACHE = [
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
  '/screenshot.png',
  '/screenshot2.png',
  '/screenshot-wide.png'
];

// ══════════════════════════════════════
// INSTALL - cache all assets
// ══════════════════════════════════════
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('App shell cached');
        return self.skipWaiting();
      })
      .catch(err => console.error('Install error:', err))
  );
});

// ══════════════════════════════════════
// ACTIVATE - clean old caches
// ══════════════════════════════════════
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => {
              console.log('Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ══════════════════════════════════════
// FETCH - offline support
// ══════════════════════════════════════
self.addEventListener('fetch', e => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // Network first untuk API calls
  if (e.request.url.includes('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          return caches.match(e.request)
            .then(cached => cached || caches.match('/bumil_pintar.html'));
        })
    );
    return;
  }

  // Cache first untuk app assets
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(e.request)
          .then(res => {
            if (!res || res.status !== 200 || res.type !== 'basic') {
              return res;
            }
            const clone = res.clone();
            caches.open(RUNTIME_CACHE)
              .then(cache => cache.put(e.request, clone));
            return res;
          })
          .catch(() => {
            // Fallback untuk offline
            if (e.request.mode === 'navigate') {
              return caches.match('/bumil_pintar.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// ══════════════════════════════════════
// BACKGROUND SYNC
// ══════════════════════════════════════
self.addEventListener('sync', e => {
  console.log('Background sync event:', e.tag);

  if (e.tag === 'sync-app-data') {
    e.waitUntil(
      (async () => {
        try {
          const res = await fetch('/api/sync', { method: 'POST' });
          if (res.ok) {
            console.log('Sync successful');
            // Notify app
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                data: await res.json()
              });
            });
          }
        } catch (err) {
          console.error('Sync failed:', err);
          if (e.lastChance) {
            // Show notification on final failure
            await self.registration.showNotification('Sync Failed', {
              body: 'Could not sync data. Will retry when online.',
              icon: '/icon-192.png',
              badge: '/icon-96.png'
            });
          }
        }
      })()
    );
  }
});

// ══════════════════════════════════════
// PERIODIC BACKGROUND SYNC
// ══════════════════════════════════════
self.addEventListener('periodicsync', e => {
  console.log('Periodic sync:', e.tag);

  if (e.tag === 'update-reminders') {
    e.waitUntil(
      (async () => {
        try {
          const res = await fetch('/api/reminders');
          const reminders = await res.json();

          // Show notifications for reminders
          const notifications = await self.registration.getNotifications();
          reminders.forEach(reminder => {
            // Jangan duplikat notification
            const exists = notifications.some(n => n.tag === reminder.id);
            if (!exists) {
              self.registration.showNotification(reminder.title, {
                body: reminder.body,
                icon: '/icon-192.png',
                badge: '/icon-96.png',
                tag: reminder.id,
                requireInteraction: false,
                data: { url: reminder.url || '/' }
              });
            }
          });
        } catch (err) {
          console.error('Reminder fetch failed:', err);
        }
      })()
    );
  }
});

// ══════════════════════════════════════
// PUSH NOTIFICATIONS
// ══════════════════════════════════════
self.addEventListener('push', e => {
  console.log('Push event received');
  
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
      tag: data.tag || 'bumil-push',
      requireInteraction: data.requireInteraction || false,
      data: { url: data.url || '/' }
    })
  );
});

// ══════════════════════════════════════
// NOTIFICATION CLICK
// ══════════════════════════════════════
self.addEventListener('notificationclick', e => {
  console.log('Notification click:', e.notification.tag);
  e.notification.close();

  e.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Focus existing window
      if (clientList.length > 0) {
        const client = clientList[0];
        client.focus();
        client.navigate(e.notification.data.url || '/');
      } else {
        // Open new window
        clients.openWindow(e.notification.data.url || '/');
      }
    })()
  );
});

// ══════════════════════════════════════
// NOTIFICATION CLOSE
// ══════════════════════════════════════
self.addEventListener('notificationclose', e => {
  console.log('Notification closed:', e.notification.tag);
  // Optional: track closed notifications
});

// ══════════════════════════════════════
// MESSAGE HANDLER - komunikasi dengan app
// ══════════════════════════════════════
self.addEventListener('message', e => {
  console.log('Message received:', e.data.type);

  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (e.data && e.data.type === 'CLEAR_CACHE') {
    caches.delete(RUNTIME_CACHE).then(() => {
      e.ports[0].postMessage({ cleared: true });
    });
  }

  if (e.data && e.data.type === 'REGISTER_PERIODIC_SYNC') {
    self.registration.periodicSync.register('update-reminders', {
      minInterval: 60 * 60 * 1000 // 1 jam
    }).then(() => {
      console.log('Periodic sync registered');
    }).catch(err => {
      console.log('Periodic sync registration failed:', err);
    });
  }
});

console.log('Service Worker loaded');
