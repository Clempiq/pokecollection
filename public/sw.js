const CACHE_NAME = 'pokecollection-v3';
const urlsToCache = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const reqUrl = new URL(event.request.url);

  // Skip non-http(s) requests (chrome-extension, etc.)
  if (!reqUrl.protocol.startsWith('http')) return;

  // Skip external domains — Supabase, PokeAPI, Cardmarket, etc.
  if (reqUrl.hostname !== self.location.hostname) return;

  // Skip Vite dev-server internals (HMR, module graph, etc.)
  if (reqUrl.pathname.startsWith('/@') || reqUrl.pathname.includes('__vite') || reqUrl.searchParams.has('t')) return;

  // Navigation requests: network first, fall back to cached /index.html (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: network first, cache on success, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && reqUrl.pathname.match(/\.(js|css|png|svg|ico|woff2?)$/)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
})

// ── Push notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title = data.title || 'PokéCollection'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: data.url ? { url: data.url } : {},
    vibrate: [100, 50, 100],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
