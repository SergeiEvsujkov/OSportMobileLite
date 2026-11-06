/**
 * РћС„Р»Р°Р№РЅ-РѕР±РѕР»РѕС‡РєР°: СЃРµС‚СЊ СЃРЅР°С‡Р°Р»Р°, РєСЌС€ вЂ” С‚РѕР»СЊРєРѕ РєРѕРіРґР° СЃРµС‚Рё РЅРµС‚.
 *
 * Р Р°РЅСЊС€Рµ С„Р°Р№Р»С‹ Р±СЂР°Р»РёСЃСЊ РёР· РєСЌС€Р° РїРµСЂРІС‹РјРё, Рё РїСЂРёР»РѕР¶РµРЅРёРµ РјРѕРіР»Рѕ РіРѕРґР°РјРё РїРѕРєР°Р·С‹РІР°С‚СЊ
 * СЃС‚Р°СЂС‹Р№ app.js РїРѕРґ С‚РµРј Р¶Рµ Р°РґСЂРµСЃРѕРј. РўРµРїРµСЂСЊ РїСЂРё РєР°Р¶РґРѕРј РѕС‚РєСЂС‹С‚РёРё С„Р°Р№Р»С‹
 * Р·Р°РїСЂР°С€РёРІР°СЋС‚СЃСЏ РёР· СЃРµС‚Рё Рё РѕР±РЅРѕРІР»СЏСЋС‚ РєСЌС€; Р±РµР· СЃРµС‚Рё СЂР°Р±РѕС‚Р°РµС‚ РїРѕСЃР»РµРґРЅСЏСЏ РєРѕРїРёСЏ.
 */

const CACHE = 'osport-lite-v230-1';

const SHELL = [
  './',
  './index.html',
  './sounds/mark_success.wav',
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
  if (url.origin !== self.location.origin) return; // С‡СѓР¶РёРµ Р·Р°РїСЂРѕСЃС‹ РЅРµ С‚СЂРѕРіР°РµРј

  // Р—Р°РїСЂРѕСЃ СЃ РјРµС‚РєРѕР№ РІРµСЂСЃРёРё: GitHub Pages РєСЌС€РёСЂСѓРµС‚ РѕС‚РІРµС‚С‹ РїРѕ РїРѕР»РЅРѕРјСѓ Р°РґСЂРµСЃСѓ,
  // РїРѕСЌС‚РѕРјСѓ В«/app.jsВ» Рё В«/index.htmlВ» Р±РµР· РїР°СЂР°РјРµС‚СЂРѕРІ РјРѕРіР»Рё РѕС‚РґР°РІР°С‚СЊСЃСЏ СЃС‚Р°СЂС‹РјРё
  // РґР°Р¶Рµ РїРѕСЃР»Рµ РІС‹РїСѓСЃРєР° РЅРѕРІРѕР№ РІРµСЂСЃРёРё. РЎРІРѕСЏ РјРµС‚РєР° Р·Р°СЃС‚Р°РІР»СЏРµС‚ CDN Р±СЂР°С‚СЊ СЃРІРµР¶РёР№ С„Р°Р№Р»
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

