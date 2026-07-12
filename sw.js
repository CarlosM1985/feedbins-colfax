// ══════════════════════════════════════════════════════
//  FEEDBINS · SERVICE WORKER
//  Maneja la cache y las actualizaciones de la app.
//
//  CÓMO ACTUALIZAR LA APP:
//  Cada vez que subas cambios, sube el número de version de abajo.
//  Ej: 'feedbins-colfax-v6'  →  'feedbins-colfax-v7'
//  Eso hace que la app detecte la version nueva y le muestre
//  al operador el boton "Actualizar".
// ══════════════════════════════════════════════════════
const CACHE = 'feedbins-colfax-v7';
const ASSETS = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
// ── INSTALL: guarda los archivos base ──
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})));
  // NO ponemos skipWaiting() aqui: dejamos que el operador
  // decida cuando actualizar con el boton (no a media lectura).
});
// ── ACTIVATE: borra las caches viejas ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// ── FETCH ──
self.addEventListener('fetch', e => {
  const req = e.request;
  // Solo manejamos GET del mismo origen. Firebase, Google Fonts,
  // gstatic, etc. pasan directo sin tocar (asi no rompemos la app).
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }
  // El documento HTML: RED PRIMERO (asi siempre ves la version nueva),
  // y la copia guardada solo si no hay internet.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then(r => {
          const cl = r.clone();
          caches.open(CACHE).then(c => c.put(req, cl));
          return r;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Todo lo demas (iconos, etc.): CACHE PRIMERO, red de respaldo.
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(r => {
        if (r && r.status === 200) {
          const cl = r.clone();
          caches.open(CACHE).then(c => c.put(req, cl));
        }
        return r;
      }).catch(() => cached)
    )
  );
});
// ── MENSAJE: el boton "Actualizar" nos habla por aqui ──
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
