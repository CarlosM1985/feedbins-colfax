// ══════════════════════════════════════════════════════
//  FEEDBINS · SERVICE WORKER
//  Maneja la caché y las actualizaciones de la app.
//
//  CÓMO ACTUALIZAR LA APP:
//  Cada vez que subas cambios, sube el número de abajo.
//  Ej: 'feedbins-v4.0.0'  →  'feedbins-v4.0.1'
//  Eso hace que la app detecte que hay una versión nueva
//  y le muestre al operador el botón de "Actualizar".
// ══════════════════════════════════════════════════════
const CACHE_VERSION = 'feedbins-v4.0.0';

// Archivos que la app necesita para funcionar sin internet.
// Como tu app es un solo index.html, con eso basta.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// ── INSTALL: guarda los archivos base ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
  // NO llamamos skipWaiting() aquí a propósito:
  // queremos que el operador decida cuándo actualizar
  // con el botón, no que se recargue de golpe a media lectura.
});

// ── ACTIVATE: borra las cachés viejas ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia "network-first" para el HTML ──
// Siempre intenta traer la versión más nueva de internet.
// Si no hay internet, usa la copia guardada (offline).
self.addEventListener('fetch', event => {
  const req = event.request;

  // Solo manejamos peticiones GET del mismo origen.
  // Firebase, Google Fonts, etc. pasan directo sin tocar.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Para el documento HTML: red primero, caché de respaldo.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Para todo lo demás: caché primero, red de respaldo.
  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => cached)
    )
  );
});

// ── MENSAJE: el botón "Actualizar" nos habla por aquí ──
// Cuando el operador toca "Actualizar", la app nos manda
// este mensaje y nosotros activamos la versión nueva.
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
