const CACHE_NAME = 'pokecollection-v1'

// Assets to cache on install (shell app)
const PRECACHE_URLS = [
  '/',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Network-first strategy: try network, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and same-origin or CDN
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  // Don't intercept Supabase API calls
  if (url.hostname.includes('supabase')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.match(/\.(js|css|png|svg|ico|woff2?)$/))) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503 })))
  )
})
