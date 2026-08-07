// Easylumi PWA Service Worker v8
const CACHE_NAME = 'easylumi-v8';

// 安装：立即跳过等待，马上接管
self.addEventListener('install', event => {
  self.skipWaiting();
});

// 接收页面发来的 skipWaiting 指令
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// 激活：删除所有旧缓存（v1、v2 全清），立即接管所有客户端
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// 请求拦截
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // HTML 页面：永远从网络获取，绝不使用缓存（彻底解决 Safari 旧版问题）
  if (req.mode === 'navigate' || req.destination === 'document' ||
      (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store', credentials: 'same-origin' }).then(resp => {
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // CSS/JS/图片等静态资源：网络优先，缓存兜底
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

  // 外部 API / JSON 数据：只走网络
  if (url.hostname.includes('cdn.jsdelivr') || url.hostname.includes('raw.github')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))
    );
    return;
  }

  // 其他：默认网络优先
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
