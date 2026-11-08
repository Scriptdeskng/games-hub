/* Naija Games service worker (generated per game at build time by scripts/vite-naija-plugin.mjs).
 * Cache-first over the precached build, EXCEPT content packs (assets/packs/*.json) which are
 * network-first with the cache as offline fallback, so packs update without a code
 * release. Version-keyed cache; old versions are deleted on activate.
 * Placeholders are replaced at build time. */
const VERSION = '__VERSION__';
const PREFIX = 'naija-__SLUG__-';
const CACHE = PREFIX + VERSION;
const FILES = __FILES__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES).then(() => cache.add('./').catch(() => undefined)))
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
  if (/\/assets\/packs\/[^/]+\.json$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        // Key without the query string so a ?token=... is never written to the cache.
        const key = url.origin + url.pathname;
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            await cache.put(key, res.clone());
            return res;
          }
          return (await cache.match(key)) || res;
        } catch (err) {
          const hit = await cache.match(key);
          if (hit) return hit;
          throw err;
        }
      }),
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // ignoreSearch: `?token=...&lang=...` must still hit the precached page (and is never stored).
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch (err) {
        if (req.mode === 'navigate') {
          const page = await cache.match('./index.html');
          if (page) return page;
        }
        throw err;
      }
    }),
  );
});
