/* Trustly Cars — minimal offline-first service worker.
   Strategy:
   - Network-first for /api/*
   - Cache-first for static assets and Unsplash images
   - When the browser comes back online, posts a 'sync-now' message
     to all clients so they flush the IndexedDB queue.
*/

const CACHE = 'trustly-v1';
const STATIC = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((r) => {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return r;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

self.addEventListener('online', () => broadcast('sync-now'));
self.addEventListener('message', (e) => {
  if (e.data === 'ping-online' && navigator.onLine) broadcast('sync-now');
});

function broadcast(msg) {
  self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage(msg)));
}
