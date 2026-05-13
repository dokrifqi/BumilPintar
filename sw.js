const CACHE_NAME = 'bumil-pintar-v6';
const RUNTIME_CACHE = 'bumil-pintar-runtime-v1';

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
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell...');
        return Promise.all(
          ASSETS_TO_CACHE.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
            });
          })
        );
      })
      .then(() => {
        console.log('[SW] App shell cached, skipping waiting');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Install error:', err);
      })
  );
});

// ══════════════════════════════════════
// ACTIVATE - claim clients & clean old caches
// ══════════════════════════════════════
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        console.log('[SW] Found caches:', cacheNames);
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
      .catch(err => {
        console.error('[SW] Activate error:', err);
      })
  );
});

// ══════════════════════════════════════
// FETCH - offline support dengan strategy berbeda
// ══════════════════════════════════════
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network first untuk API calls
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE)
              .then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          console.log('[SW] API call offline, returning cached');
          return caches.match(request)
            .then(cached => cached || caches.match('/bumil_pintar.html'));
        })
    );
    return;
  }

  // Cache first untuk static assets
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          console.log('[SW] Serving from cache:', url.pathname);
          return cached;
        }

        return fetch(request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'error') {
              console.log('[SW] Bad response, not caching:', url.pathname);
              return response;
            }

            const clone = response.clone();
            caches.open(RUNTIME_CACHE)
              .then(cache => {
                cache.put(request, clone)
                  .catch(err => console.warn('[SW] Cache put error:', err));
              });
            
            return response;
          })
          .catch(err => {
            console.log('[SW] Fetch error, offline fallback:', url.pathname);
            
            // Fallback untuk navigate requests
            if (request.mode === 'navigate') {
              return caches.match('/bumil_pintar.html');
            }

            // Fallback untuk other requests
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// ══════════════════════════════════════
// BACKGROUND SYNC
// ══════════════════════════════════════
self.addEventListener('sync', event => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-app-data') {
    event.waitUntil(
      (async () => {
        try {
          const response = await fetch('/api/sync', { method: 'POST' });
          if (response.ok) {
            const data = await response.json();
            console.log('[SW] Sync successful');
            
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                data: data
              });
            });
          }
        } catch (error) {
          console.error('[SW] Sync failed:', error);
          if (event.lastChance) {
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_FAILED',
                error: error.message
              });
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
self.addEventListener('periodicsync', event => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'update-reminders') {
    event.waitUntil(
      (async () => {
        try {
          const response = await fetch('/api/reminders');
          const reminders = await response.json();

          const notifications = await self.registration.getNotifications();
          const notificationIds = notifications.map(n => n.tag);

          for (const reminder of reminders) {
            if (!notificationIds.includes(reminder.id)) {
              await self.registration.showNotification(
                reminder.title,
                {
                  body: reminder.body,
                  icon: '/icon-192.png',
                  badge: '/icon-96.png',
                  tag: reminder.id,
                  requireInteraction: false,
                  data: { url: reminder.url || '/' }
                }
              );
            }
          }
          console.log('[SW] Reminders updated:', reminders.length);
        } catch (error) {
          console.error('[SW] Reminder fetch failed:', error);
        }
      })()
    );
  }
});

// ══════════════════════════════════════
// PUSH NOTIFICATIONS
// ══════════════════════════════════════
self.addEventListener('push', event => {
  console.log('[SW] Push event received');
  
  const data = event.data 
    ? event.data.json() 
    : {
        title: 'Bumil Pintar',
        body: 'Ada pengingat kehamilan untuk Anda!',
        icon: '/icon-192.png'
      };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Bumil Pintar',
      {
        body: data.body || 'Ada pengingat kehamilan untuk Anda!',
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-96.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'bumil-push',
        requireInteraction: data.requireInteraction || false,
        data: { url: data.url || '/' }
      }
    )
  );
});

// ══════════════════════════════════════
// NOTIFICATION CLICK
// ══════════════════════════════════════
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click:', event.notification.tag);
  event.notification.close();

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      let client = null;

      // Cari window yang sudah terbuka
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === '/' && 'focus' in clientList[i]) {
          client = clientList[i];
          break;
        }
      }

      if (client) {
        client.focus();
        client.navigate(event.notification.data.url || '/');
      } else if (self.clients.openWindow) {
        client = await self.clients.openWindow(event.notification.data.url || '/');
      }
    })()
  );
});

// ══════════════════════════════════════
// NOTIFICATION CLOSE
// ══════════════════════════════════════
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// ══════════════════════════════════════
// MESSAGE HANDLER
// ══════════════════════════════════════
self.addEventListener('message', event => {
  const { type } = event.data || {};
  console.log('[SW] Message received:', type);

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'CLEAR_CACHE') {
    caches.delete(RUNTIME_CACHE)
      .then(() => {
        console.log('[SW] Cache cleared');
        if (event.ports[0]) {
          event.ports[0].postMessage({ cleared: true });
        }
      });
  }

  if (type === 'REGISTER_PERIODIC_SYNC') {
    if (self.registration.periodicSync) {
      self.registration.periodicSync
        .register('update-reminders', {
          minInterval: 60 * 60 * 1000 // 1 jam
        })
        .then(() => {
          console.log('[SW] Periodic sync registered');
          if (event.ports[0]) {
            event.ports[0].postMessage({ registered: true });
          }
        })
        .catch(err => {
          console.log('[SW] Periodic sync registration failed:', err);
          if (event.ports[0]) {
            event.ports[0].postMessage({ registered: false, error: err.message });
          }
        });
    }
  }

  if (type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(RUNTIME_CACHE)
      .then(cache => {
        return Promise.all(
          urls.map(url => cache.add(url).catch(err => {
            console.warn('[SW] Failed to cache:', url, err);
          }))
        );
      })
      .then(() => {
        console.log('[SW] URLs cached:', urls.length);
        if (event.ports[0]) {
          event.ports[0].postMessage({ cached: true });
        }
      });
  }
});

console.log('[SW] Service Worker initialized - ready for offline mode');
