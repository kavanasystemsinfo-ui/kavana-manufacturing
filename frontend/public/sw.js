/*
 * Trabajador de servicio del HMI.
 *
 * Su trabajo es que la aplicación siga en pie sin red: guarda el armazón (el
 * HTML, el JavaScript y los estilos) y lo sirve cuando el servidor no responde.
 * En planta la red va a ratos y una recarga sin cobertura no puede dejar al
 * operario mirando el error del navegador.
 *
 * Lo que NO guarda aquí: nada que venga de la API. Los datos de planta viven en
 * IndexedDB, que se purga al cerrar sesión, porque el quiosco es compartido
 * entre turnos. Una caché del navegador sobreviviría al cierre de sesión y
 * dejaría datos del turno anterior al siguiente operario.
 */

const VERSION = 'kavana-hmi-v1';
const ARMAZON = ['/', '/index.html', '/manifest.webmanifest', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await Promise.all(
        ARMAZON.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((nombre) => nombre !== VERSION).map((nombre) => caches.delete(nombre)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Las mutaciones nunca se cachean: si se pierden, el parte lo reintenta la
  // cola de la aplicación, no el navegador.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // La API siempre va a la red.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(navegacion(request));
    return;
  }

  event.respondWith(estatico(request));
});

/** Navegación: lo fresco manda, y si no hay red se sirve el armazón guardado. */
async function navegacion(request) {
  const cache = await caches.open(VERSION);
  try {
    const respuesta = await fetch(request);
    if (respuesta && respuesta.ok) {
      await cache.put('/', respuesta.clone());
    }
    return respuesta;
  } catch {
    const guardado = (await cache.match('/')) || (await cache.match('/index.html'));
    if (guardado) return guardado;
    throw new Error('sin red y sin copia del armazón');
  }
}

/** Recursos: se sirve la copia y se refresca por detrás. */
async function estatico(request) {
  const cache = await caches.open(VERSION);
  const guardado = await cache.match(request);

  if (guardado) {
    fetch(request)
      .then((respuesta) => {
        if (respuesta && respuesta.ok) cache.put(request, respuesta.clone());
      })
      .catch(() => undefined);
    return guardado;
  }

  const respuesta = await fetch(request);
  if (respuesta && respuesta.ok) {
    await cache.put(request, respuesta.clone());
  }
  return respuesta;
}
