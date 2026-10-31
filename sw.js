/**
 * Офлайн-оболочка: сеть сначала, кэш — только когда сети нет.
 *
 * Раньше файлы брались из кэша первыми, и приложение могло годами показывать
 * старый app.js под тем же адресом. Теперь при каждом открытии файлы
 * запрашиваются из сети и обновляют кэш; без сети работает последняя копия.
 */

const CACHE = 'osport-lite-v149';

const SHELL = [
  './',
  './index.html',
  './vkid-sdk.js',
  './manifest.json',
  './icons/group.png',
  './icons.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-1024.png',
  './icons/icon-180.png',
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
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return; // чужие запросы не трогаем

  // Запрос с меткой версии: GitHub Pages кэширует ответы по полному адресу,
  // поэтому «/app.js» и «/index.html» без параметров могли отдаваться старыми
  // даже после выпуска новой версии. Своя метка заставляет CDN брать свежий файл
  const freshUrl = new URL(event.request.url);
  freshUrl.searchParams.set('sw', CACHE);
  const fresh = new Request(freshUrl.toString(), { cache: 'reload' });

  event.respondWith(
    fetch(fresh)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
