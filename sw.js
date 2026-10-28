/**
 * Офлайн-оболочка: кэшируем только собственные файлы приложения.
 *
 * Запросы к облачной функции сюда не попадают: они должны идти в сеть всегда,
 * иначе данные устареют. Если сети нет, приложение откроется, но поиск события
 * скажет об ошибке — это честнее, чем показывать старую карточку.
 */

const CACHE = 'osport-lite-v15';
const SHELL = [
  './',
  './index.html',
  './styles.css?v=14',
  './jsQR.js?v=14',
  './marking.js?v=14',
  './app.js?v=14',
  './manifest.json',
  './icons/group.png',
  './icons.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // чужие запросы не трогаем

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
