// Service Worker de Atril Digital
// Permite que la app se abra y funcione sin conexión, una vez visitada
// al menos una vez con internet (para poder descargar y guardar los
// archivos en la caché del dispositivo).

const CACHE_NAME = 'atril-digital-v4';

// Archivos propios de la app (mismo origen)
const APP_SHELL = [
  './atril-digital.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Recursos externos (fuentes y la librería de PDF) que también
// conviene guardar para que funcionen sin conexión.
const EXTERNAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600&family=Space+Mono&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // El "app shell" es imprescindible: si falla, queremos saberlo.
      await cache.addAll(APP_SHELL);

      // Los recursos externos son "best effort": si alguno falla
      // (por ejemplo, sin conexión en la primera instalación), no
      // debe romper la instalación del resto de la app.
      await Promise.all(
        EXTERNAL_ASSETS.map((url) =>
          fetch(url, { mode: 'no-cors' })
            .then((res) => cache.put(url, res))
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Guarda en caché una copia de lo que se vaya pidiendo,
          // para que la próxima vez también esté disponible offline.
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy).catch(() => {});
          });
          return response;
        })
        .catch(() => {
          // Sin conexión y sin copia en caché: no hay nada que servir.
          // (En la práctica, esto solo afectaría a un recurso nuevo
          // que nunca se haya cargado antes con internet.)
        });
    })
  );
});
