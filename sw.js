// Easylumi PWA Service Worker
const CACHE_NAME = 'easylumi-v1';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// 安装：预缓存核心文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// 请求拦截：网络优先，失败回退缓存
self.addEventListener('fetch', event => {
  const req = event.request;
  // 只处理 GET
  if (req.method !== 'GET') return;

  // 跳过 Gist / 外部 API（必须联网）
  const url = new URL(req.url);
  if (url.hostname.includes('gist.githubusercontent') || url.hostname.includes('localhost')) {
    // 网络优先
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // 本地资源：缓存优先，回退网络
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(resp => {
        // 缓存新资源
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
