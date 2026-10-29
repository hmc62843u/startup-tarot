const CACHE_NAME = 'founder-gap-a14cd6d86514';
const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './packs/active-pack.js',
  './docs/examples.html',
  './docs/guide.html',
  './docs/data-license.html',
  './docs/license.html',
  './LICENSE',
  './DATA_LICENSE.md',
  './README.md',
  './EXAMPLES.md',
  './GUIDE.md',
  './DEVELOPMENT.md',
  './assets/how-it-works.svg',
  './data/schema.json',
  './data/guide-pack.schema.json',
  './data/guide-pack-v1.schema.json',
  './data/guide-pack-v2.schema.json',
  './css/style.css?v=a14cd6d86514',
  './js/app.bundle.js?v=a14cd6d86514',
  './data/library.json',
  './data/startup-library.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_FILES.map(path => new URL(path, self.registration.scope)));
      const indexUrl = new URL('./data/library.json', self.registration.scope);
      const manifest = await (await cache.match(indexUrl)).json();
      await cache.addAll(manifest.profiles.map(path => new URL(path, indexUrl)));
      const snapshotIndexUrl = new URL('./data/startup-library.json', self.registration.scope);
      const snapshotIndex = await (await cache.match(snapshotIndexUrl)).json();
      await cache.addAll(snapshotIndex.snapshots.map(path => new URL(path, snapshotIndexUrl)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.registration.scope)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const fallback = new URL('./index.html', self.registration.scope);
        return (await caches.match(fallback)) || Response.error();
      }
      return new Response('Offline and this resource is not cached.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter(cacheName => cacheName.startsWith('founder-gap-') && cacheName !== CACHE_NAME)
      .map(cacheName => caches.delete(cacheName)));
    await self.clients.claim();
  })());
});
