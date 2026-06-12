const CACHE = 'feedbins-colfax-v7';
const ASSETS = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isHTML = url.endsWith('.html') || url.endsWith('/') || url === self.location.origin + '/feedbins-colfax/';

  if (isHTML) {
    // Network first for HTML — always get latest version
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r && r.status === 200) {
            const cl = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, cl));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache first for icons, manifest, etc.
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(r => {
          if (r && r.status === 200) {
            const cl = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, cl));
          }
          return r;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});
