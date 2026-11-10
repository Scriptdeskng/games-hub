/* Naija Games HUB service worker (scope: the site root). Caches ONLY the hub shell listed in FILES.
 * Everything else, including every /<slug>/ page and asset, is left alone: each game has its own
 * sw.js with the scope /<slug>/ and its own `naija-<slug>-` caches, so the two never collide.
 * Placeholders are replaced by scripts/build-hub.mjs. */
const VERSION = '__VERSION__';
const PREFIX = 'naija-hub-';
const CACHE = PREFIX + VERSION;
const FILES = __FILES__;

const scope = new URL('./', self.location.href).pathname;
const SHELL = new Set(FILES.map((f) => new URL(f, self.location.href).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  let path = url.pathname;
  if (path === scope + 'index.html') path = scope;
  if (!SHELL.has(path)) return; // a game, 404.html or anything else: straight to the network
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(path, { ignoreSearch: true });
      if (hit) return hit;
      return fetch(req);
    }),
  );
});
