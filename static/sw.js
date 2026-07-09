// Service Worker for Math & Beer PWA
const CACHE_NAME = 'mathandbeer-static-v8';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/static/css/main.css',
  '/static/css/games.css',
  '/static/scripts/main.js',
  '/static/scripts/utils.js',
  '/static/scripts/profile.js',
  '/static/scripts/game_info.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(name => {
        if (name !== CACHE_NAME) return caches.delete(name);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls – network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets – network first so deployments show the latest CSS/JS immediately
  if (request.method === 'GET' && (url.pathname.startsWith('/static/') || url.pathname === '/manifest.json' || url.pathname === '/sw.js')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Other requests – cache first
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
