/* Service worker — CEIA Inapewma Coronel
 * - Hace la página instalable y rápida de abrir.
 * - NUNCA guarda en caché los datos: las llamadas a Apps Script siempre van a la red.
 */
const VERSION = 'ceia-v3';
const SHELL = ['./', 'index.html', 'config.js', 'logo.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // las operaciones con datos (POST) pasan directo
  const url = new URL(req.url);
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) {
    if (url.hostname === 'script.google.com' || url.hostname.endsWith('googleusercontent.com')) return; // API: sin caché
  }

  // Archivos de la propia aplicación: red primero (siempre la versión más nueva), caché si no hay conexión
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  // Librerías externas (Tailwind, Chart.js, fuentes…): caché primero
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
