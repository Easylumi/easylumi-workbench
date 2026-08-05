// Easylumi PWA Service Worker v2 — 网络优先，解决缓存旧版问题
const CACHE_NAME = 'easylumi-v2';

// 安装：跳过预缓存，直接激活
self.addEventListener('install', event => {
  self.skipWaiting();
});

// 激活：清空所有旧缓存（包括 v1）
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => caches.delete(k))  // 删除所有缓存，不管是 v1 还是 v2
    ))
  );
  self.clients.claim();
});

// 请求拦截：网络优先，失败回退缓存
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // HTML 页面请求：始终网络优先（解决缓存旧版问题）
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 外部 API：只走网络
  if (url.hostname.includes('cdn.jsdelivr') || url.hostname.includes('localhost')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // 其他静态资源：网络优先，回退缓存
  event.respondWith(
    fetch(req).then(resp => {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
      }
      return resp;
    }).catch(() => caches.match(req))
  );
});
