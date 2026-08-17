// Easylumi PWA Service Worker v10
const CACHE_NAME = 'easylumi-v10';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (req.mode === 'navigate' || req.destination === 'document' ||
      (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store', credentials: 'same-origin' }).then(resp => {
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (req.destination === 'style' || req.destination === 'script' ||
      req.destination === 'image' || req.destination === 'font') {
    event.respondWith(
      fetch(req, { cache: 'no-cache' }).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (url.hostname.includes('cdn.jsdelivr') || url.hostname.includes('raw.github')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
